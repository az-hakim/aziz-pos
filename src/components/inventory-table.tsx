"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export type InventoryRow = {
  id: number;
  branch: string;
  productId: number;
  product: string;
  sku: string;
  barcode: string;
  unit: string;
  quantity: number;
  lowStockAlert: number;
};

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.product, row.sku, row.barcode, row.branch].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Current Stock</h1>
          <p className="text-sm text-slate-500">{rows.length} stock records</p>
        </div>
        <Input
          aria-label="Search inventory"
          placeholder="Search product, SKU or barcode…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-64"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {["Branch", "Product", "SKU", "Barcode", "Unit", "Quantity", "Low Stock At", "Status"].map(
                (label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const status =
                row.quantity === 0
                  ? { label: "Out of Stock", className: "bg-rose-100 text-rose-700", row: "bg-rose-50" }
                  : row.quantity <= row.lowStockAlert
                    ? { label: "Low Stock", className: "bg-amber-100 text-amber-700", row: "bg-amber-50" }
                    : { label: "In Stock", className: "bg-emerald-100 text-emerald-700", row: "" };
              return (
                <tr key={row.id} className={`border-t border-slate-100 ${status.row}`}>
                  <td className="px-4 py-3">{row.branch}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.product}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.barcode}</td>
                  <td className="px-4 py-3">{row.unit}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{row.quantity}</td>
                  <td className="px-4 py-3 tabular-nums">{row.lowStockAlert}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No stock records yet. Use Stock In to add opening stock.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
