"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustStock } from "@/app/(app)/inventory/actions";

const reasons = {
  IN: [
    { value: "OPENING_STOCK", label: "Opening Stock" },
    { value: "PURCHASE", label: "Purchase" },
    { value: "TRANSFER_IN", label: "Transfer In" },
    { value: "SALE_RETURN", label: "Sale Return" },
  ],
  OUT: [
    { value: "PURCHASE_RETURN", label: "Purchase Return" },
    { value: "DAMAGE", label: "Damage" },
    { value: "EXPIRED", label: "Expired" },
    { value: "TRANSFER_OUT", label: "Transfer Out" },
  ],
};

export function StockForm({
  type,
  branches,
  products,
  fixedBranchId,
  fixedBranchName,
}: {
  type: "IN" | "OUT";
  branches: { id: number; name: string }[];
  products: { id: number; name: string; sku: string }[];
  fixedBranchId?: number;
  fixedBranchName?: string;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(String(fixedBranchId ?? branches[0]?.id ?? ""));
  const [productId, setProductId] = useState("");
  const [reason, setReason] = useState(reasons[type][0].value);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(null);
    const result = await adjustStock({
      type,
      branchId: Number(branchId),
      productId: Number(productId),
      reason,
      quantity: Number(quantity),
      note,
    });
    setPending(false);
    if (result.error) setError(result.error);
    else {
      setSaved(`${quantity} unit(s) recorded successfully.`);
      setQuantity("");
      setNote("");
      router.refresh();
    }
  }

  const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm";

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{type === "IN" ? "Stock Check-In" : "Stock Check-Out"}</h1>
        <p className="text-sm text-slate-500">
          {type === "IN"
            ? "Add stock to a branch. Every adjustment is recorded in the movement log."
            : "Remove stock from a branch. Quantities above available stock are blocked."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          {fixedBranchId ? (
            <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm">
              {fixedBranchName ?? "Assigned branch"}
            </div>
          ) : (
            <select id="branch" className={selectClass} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product">Product</Label>
          <select
            id="product"
            className={selectClass}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            <option value="">Select a product…</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <select id="reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons[type].map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            step="1"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">{saved}</p>}

        <Button
          type="submit"
          disabled={pending}
          className={type === "OUT" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
        >
          {pending ? "Saving…" : type === "IN" ? "Check In" : "Check Out"}
        </Button>
      </form>
    </div>
  );
}
