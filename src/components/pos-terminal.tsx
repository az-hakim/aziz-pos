"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { checkout, type ReceiptData } from "@/app/(app)/pos/actions";
import { dateTime, money, round2 } from "@/lib/format";

export type PosProduct = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  unit: string;
  stock: number;
};

type CartLine = {
  productId: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  quantity: number;
};

export function PosTerminal({
  products,
  branchName,
  cashierName,
  needsBranch,
}: {
  products: PosProduct[];
  branchName: string;
  cashierName: string;
  needsBranch: boolean;
}) {
  const router = useRouter();
  const scanRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<() => void>(() => {});
  const [scan, setScan] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENT">("FLAT");
  const [discountValue, setDiscountValue] = useState("0");
  const [taxPercent, setTaxPercent] = useState("0");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [method, setMethod] = useState<"CASH" | "CARD" | "MOBILE_BANKING">("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [autoPrint, setAutoPrint] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Hardware scanners type into the focused field; keep it focused unless the user is in another input.
  useEffect(() => {
    scanRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable)) return;
      if (event.key.length === 1) scanRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: receipt ? `receipt-${receipt.invoiceNumber}` : "receipt",
    pageStyle: "@page { size: 80mm auto; margin: 2mm; } body { margin: 0; }",
  });
  useEffect(() => {
    printRef.current = handlePrint;
  }, [handlePrint]);

  const invoice = receipt?.invoiceNumber;
  useEffect(() => {
    if (!invoice || !autoPrint) return;
    const timer = window.setTimeout(() => printRef.current(), 600);
    return () => window.clearTimeout(timer);
  }, [invoice, autoPrint]);

  const matches = useMemo(() => {
    const term = scan.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((product) =>
        [product.barcode, product.sku, product.name].some((value) => value.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [products, scan]);

  const subtotal = round2(cart.reduce((sum, line) => sum + line.quantity * line.price, 0));
  const discountAmount = round2(
    discountType === "FLAT"
      ? Math.min(Number(discountValue) || 0, subtotal)
      : (subtotal * (Number(discountValue) || 0)) / 100,
  );
  const taxAmount = round2(((subtotal - discountAmount) * (Number(taxPercent) || 0)) / 100);
  const grandTotal = round2(subtotal - discountAmount + taxAmount);
  const change = round2((Number(amountPaid) || 0) - grandTotal);

  function addProduct(product: PosProduct) {
    const existing = cart.find((line) => line.productId === product.id);
    if (existing && existing.quantity + 1 > product.stock) {
      setError(`Only ${product.stock} unit(s) of ${product.name} are available.`);
      return;
    }
    if (!existing && product.stock < 1) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    setCart((lines) =>
      existing
        ? lines.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [...lines, { ...product, productId: product.id, quantity: 1 }],
    );
    setError(null);
    setScan("");
    scanRef.current?.focus();
  }

  function onScanSubmit(event: React.FormEvent) {
    event.preventDefault();
    const term = scan.trim().toLowerCase();
    if (!term) return;
    const product =
      products.find((item) => item.barcode.toLowerCase() === term || item.sku.toLowerCase() === term) ??
      products.find((item) => item.name.toLowerCase().includes(term)) ??
      matches[0];
    if (!product) {
      setError("No product matches that barcode or search.");
      return;
    }
    addProduct(product);
  }

  function changeQuantity(productId: number, delta: number) {
    if (delta > 0) {
      const line = cart.find((item) => item.productId === productId);
      if (line && line.quantity + delta > line.stock) {
        setError(`Only ${line.stock} unit(s) of ${line.name} are available.`);
        return;
      }
    }
    setCart((lines) =>
      lines
        .map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + delta } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  async function confirmPayment() {
    setPending(true);
    setError(null);
    const result = await checkout({
      items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      discountType,
      discountValue: Number(discountValue) || 0,
      taxPercent: Number(taxPercent) || 0,
      paymentMethod: method,
      amountPaid: Number(amountPaid) || 0,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setReceipt(result.sale ?? null);
    setPaymentOpen(false);
    setCart([]);
    setAmountPaid("");
    router.refresh();
  }

  const field = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Point of Sale</h1>
          <p className="text-sm text-slate-500">
            {branchName} · {cashierName}
          </p>
        </div>
        <span className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
          {products.length} products available
        </span>
      </div>

      {needsBranch && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Choose a specific branch in the header to open the terminal.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <form onSubmit={onScanSubmit} className="relative">
              <Label htmlFor="barcode-input" className="sr-only">Scan barcode or search product</Label>
              <Input
                id="barcode-input"
                ref={scanRef}
                autoFocus
                autoComplete="off"
                placeholder="Scan barcode or type product name / SKU, then Enter…"
                value={scan}
                onChange={(event) => setScan(event.target.value)}
                className="font-mono"
              />
              {matches.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                  {matches.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span>{product.name}</span>
                        <span className="font-mono text-xs text-slate-500">{product.sku}</span>
                        <span className="tabular-nums text-slate-700">{money(product.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  {["Product", "Qty", "Unit Price", "Subtotal", ""].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map((line) => (
                  <tr key={line.productId} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{line.name}</div>
                      <div className="font-mono text-xs text-slate-400">{line.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => changeQuantity(line.productId, -1)} aria-label={`Decrease ${line.name}`}>−</Button>
                        <span className="w-6 text-center font-medium tabular-nums">{line.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => changeQuantity(line.productId, 1)} aria-label={`Increase ${line.name}`}>+</Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{money(line.price)}</td>
                    <td className="px-4 py-3 font-medium tabular-nums">{money(line.quantity * line.price)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => changeQuantity(line.productId, -line.quantity)}>Remove</Button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Cart is empty. Scan a barcode to add the first item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Order Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{money(subtotal)}</dd></div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Discount</dt>
                <dd className="flex items-center gap-1">
                  <select
                    aria-label="Discount type"
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={discountType}
                    onChange={(event) => setDiscountType(event.target.value as "FLAT" | "PERCENT")}
                  >
                    <option value="FLAT">৳</option>
                    <option value="PERCENT">%</option>
                  </select>
                  <Input
                    aria-label="Discount value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    className="h-8 w-20 tabular-nums"
                  />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Tax (%)</dt>
                <dd>
                  <Input
                    aria-label="Tax percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxPercent}
                    onChange={(event) => setTaxPercent(event.target.value)}
                    className="h-8 w-20 tabular-nums"
                  />
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">
                <dt>Grand Total</dt>
                <dd className="tabular-nums">{money(grandTotal)}</dd>
              </div>
            </dl>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <Button
              className="mt-6 w-full bg-blue-600 py-6 text-base hover:bg-blue-700"
              disabled={cart.length === 0 || pending || needsBranch}
              onClick={() => {
                setAmountPaid(grandTotal.toFixed(2));
                setPaymentOpen(true);
              }}
            >
              Pay Order
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={paymentOpen} onOpenChange={(open) => { if (!pending) setPaymentOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount due</span>
              <span className="font-bold tabular-nums">{money(grandTotal)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment method</Label>
              <select
                id="payment-method"
                className={field}
                value={method}
                onChange={(event) => setMethod(event.target.value as typeof method)}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="MOBILE_BANKING">Mobile Banking</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-paid">Cash tendered (৳)</Label>
              <Input
                id="amount-paid"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                className="tabular-nums"
              />
              <div className="flex flex-wrap gap-2">
                {[grandTotal, Math.ceil(grandTotal / 100) * 100, Math.ceil(grandTotal / 500) * 500].map((value) => (
                  <Button key={value} size="sm" variant="outline" onClick={() => setAmountPaid(value.toFixed(2))}>
                    {money(value)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">Change</span>
              <span className={`font-medium tabular-nums ${change < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {money(Math.max(0, change))}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={autoPrint} onChange={(event) => setAutoPrint(event.target.checked)} />
              Auto-print receipt
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={pending || change < 0}
              onClick={confirmPayment}
            >
              {pending ? "Processing payment…" : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receipt !== null} onOpenChange={(open) => { if (!open) setReceipt(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {receipt && (
            <>
              <div ref={receiptRef} className="print-receipt mx-auto w-[80mm] bg-white p-2 font-mono text-[11px] leading-tight text-slate-900">
                <div className="text-center text-sm font-bold">AZIZ POS</div>
                <div className="text-center">{receipt.branchName}</div>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <div>Invoice: {receipt.invoiceNumber}</div>
                <div>Date: {dateTime(receipt.createdAt)}</div>
                <div>Cashier: {receipt.cashierName}</div>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <table className="w-full">
                  <thead>
                    <tr className="text-left"><th>Item</th><th>Qty</th><th className="text-right">Price</th></tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item, index) => (
                      <tr key={index}>
                        <td className="pr-1">{item.name}</td>
                        <td className="tabular-nums">{item.quantity}</td>
                        <td className="text-right tabular-nums">{money(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(receipt.subtotal)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span className="tabular-nums">-{money(receipt.discountAmount)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span className="tabular-nums">{money(receipt.taxAmount)}</span></div>
                <div className="mt-1 flex justify-between border-t border-slate-800 pt-1 font-bold">
                  <span>Total</span><span className="tabular-nums">{money(receipt.grandTotal)}</span>
                </div>
                <div className="flex justify-between"><span>Paid ({receipt.paymentMethod.replace("_", " ")})</span><span className="tabular-nums">{money(receipt.amountPaid)}</span></div>
                <div className="flex justify-between"><span>Change</span><span className="tabular-nums">{money(receipt.changeReturned)}</span></div>
                <div className="my-2 border-t border-dashed border-slate-400" />
                <div className="flex justify-center">
                  <Barcode value={receipt.invoiceNumber} format="CODE128" width={1} height={30} displayValue />
                </div>
                <div className="mt-2 text-center">Thank you for shopping with us!</div>
              </div>
              <Button onClick={() => handlePrint()}>Print Receipt</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
