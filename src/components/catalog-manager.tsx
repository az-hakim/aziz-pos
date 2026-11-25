"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogEntity } from "@/lib/catalog";
import {
  deleteCatalogItem,
  saveCatalogItem,
} from "@/app/(app)/catalog/actions";

export type CatalogRow = Record<string, string | number | boolean | null>;
export type CatalogField = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "checkbox";
  options?: { value: string; label: string }[];
};
export type CatalogColumn = { key: string; label: string; currency?: boolean };

export function CatalogManager({
  entity,
  title,
  rows,
  columns,
  fields,
  searchKeys,
}: {
  entity: CatalogEntity;
  title: string;
  rows: CatalogRow[];
  columns: CatalogColumn[];
  fields: CatalogField[];
  searchKeys: string[];
}) {
  const router = useRouter();
  const stickerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CatalogRow | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [barcodeRow, setBarcodeRow] = useState<CatalogRow | null>(null);
  const [priceRow, setPriceRow] = useState<CatalogRow | null>(null);
  const [price, setPrice] = useState("");

  const handlePrint = useReactToPrint({
    contentRef: stickerRef,
    documentTitle: `barcode-${barcodeRow?.sku ?? "sticker"}`,
    pageStyle: "@page { size: 38mm 25mm; margin: 0; }",
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)),
    );
  }, [rows, search, searchKeys]);

  function openForm(row?: CatalogRow) {
    setEditing(row ?? "new");
    const initial: Record<string, string | boolean> = {};
    for (const field of fields) {
      initial[field.key] = row
        ? field.type === "checkbox"
          ? Boolean(row[field.key])
          : String(row[field.key] ?? "")
        : field.type === "checkbox"
          ? true
          : "";
    }
    setValues(initial);
    setError(null);
  }

  async function save() {
    if (!editing) return;
    const result = await saveCatalogItem(
      entity,
      editing === "new" ? null : Number(editing.id),
      values,
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: number) {
    const result = await deleteCatalogItem(entity, id);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function savePrice() {
    if (!priceRow) return;
    const result = await saveCatalogItem("product", Number(priceRow.id), {
      ...priceRow,
      sellingPrice: price,
    });
    if (result.error) setError(result.error);
    else {
      setPriceRow(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{rows.length} records</p>
        </div>
        <div className="flex gap-2">
          <Input
            aria-label={`Search ${title}`}
            placeholder="Search…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
          <Button onClick={() => openForm()}>New</Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">{column.label}</th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={String(row.id)} className="border-t border-slate-100">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 ${column.currency ? "tabular-nums" : ""}`}
                  >
                    {column.currency
                      ? `৳${Number(row[column.key] ?? 0).toFixed(2)}`
                      : String(row[column.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openForm(row)}>Edit</Button>
                    {entity === "product" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setBarcodeRow(row)}>Barcode</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setPriceRow(row); setPrice(String(row.sellingPrice ?? "")); }}>Price</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(Number(row.id))}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? `New ${title}` : `Edit ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                {field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.key])}
                      onChange={(event) => setValues({ ...values, [field.key]: event.target.checked })}
                    />
                    {field.label}
                  </label>
                ) : (
                  <>
                    <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                    {field.type === "select" ? (
                      <select
                        id={`field-${field.key}`}
                        value={String(values[field.key] ?? "")}
                        onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Select…</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`field-${field.key}`}
                        type={field.type === "number" ? "number" : "text"}
                        value={String(values[field.key] ?? "")}
                        onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={priceRow !== null} onOpenChange={(open) => !open && setPriceRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set selling price</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{String(priceRow?.name ?? "")}</p>
            <div className="space-y-2">
              <Label htmlFor="selling-price">Selling price (৳)</Label>
              <Input id="selling-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
            </div>
            <Button onClick={savePrice} className="bg-blue-600 hover:bg-blue-700">Update price</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={barcodeRow !== null} onOpenChange={(open) => !open && setBarcodeRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Barcode sticker</DialogTitle></DialogHeader>
          <div ref={stickerRef} className="print-sticker mx-auto flex w-[38mm] flex-col items-center justify-center border border-slate-200 bg-white p-1 text-center">
            <div className="text-[8pt] font-semibold">AZIZ POS</div>
            <div className="max-w-full truncate text-[9pt]">{String(barcodeRow?.name ?? "")}</div>
            {barcodeRow && (
              <Barcode value={String(barcodeRow.barcode)} format="CODE128" width={1} height={32} displayValue={false} />
            )}
            <div className="text-[10pt] font-bold tabular-nums">
              {String(barcodeRow?.sku ?? "")} · ৳{Number(barcodeRow?.sellingPrice ?? 0).toFixed(2)}
            </div>
          </div>
          <Button onClick={() => handlePrint()}>Print Sticker</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
