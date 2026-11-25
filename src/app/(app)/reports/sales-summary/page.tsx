import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { db } from "@/lib/db";
import { dateTime, money, round2 } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";

type Params = Record<string, string | string[] | undefined>;

function dateParam(value: string | undefined, fallback: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function inputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function SalesSummaryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER", "CASHIER"]);
  const params = await searchParams;
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const isCashier = user.role === "CASHIER";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = isCashier ? today : dateParam(get("from"), new Date(now.getFullYear(), now.getMonth(), 1));
  const to = isCashier ? today : dateParam(get("to"), today);
  const exclusiveTo = new Date(to.getTime() + 24 * 60 * 60 * 1000);

  const requestedBranch = await getBranchFilter(user);
  const branches = isCashier
    ? []
    : await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  let branchId = isCashier ? (user.branchId ?? -1) : requestedBranch;
  if (user.role === "SUPER_ADMIN" && get("branch")) {
    const selected = get("branch");
    branchId = selected === "all" ? undefined : Number(selected);
    if (branchId !== undefined && !branches.some((branch) => branch.id === branchId)) branchId = undefined;
  }
  const activeBranch = branches.find((branch) => branch.id === branchId);
  const branchTitle = isCashier
    ? "My Shift"
    : (activeBranch?.name ?? "All Branches");

  const sales = await db.sale.findMany({
    where: {
      branchId,
      createdAt: { gte: from, lt: exclusiveTo },
      ...(isCashier ? { cashierId: Number(user.id) } : {}),
    },
    include: {
      branch: { select: { name: true } },
      cashier: { select: { name: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totals = sales.reduce(
    (sum, sale) => ({
      subtotal: round2(sum.subtotal + sale.subtotal.toNumber()),
      discount: round2(sum.discount + sale.discountAmount.toNumber()),
      tax: round2(sum.tax + sale.taxAmount.toNumber()),
      total: round2(sum.total + sale.grandTotal.toNumber()),
    }),
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );

  return (
    <div className="print-ledger space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {isCashier ? "My Shift Sales" : "Sales Summary"}
          </h1>
          <p className="text-sm text-slate-500">Filter the ledger, then print or save as PDF.</p>
        </div>
        <PrintButton />
      </div>

      <form method="get" className="no-print flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {!isCashier && (
          <div className="space-y-1">
            <label htmlFor="from" className="block text-xs text-slate-500">From</label>
            <input id="from" name="from" type="date" defaultValue={inputDate(from)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" />
          </div>
        )}
        {!isCashier && (
          <div className="space-y-1">
            <label htmlFor="to" className="block text-xs text-slate-500">To</label>
            <input id="to" name="to" type="date" defaultValue={inputDate(to)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" />
          </div>
        )}
        {user.role === "SUPER_ADMIN" && (
          <div className="space-y-1">
            <label htmlFor="branch" className="block text-xs text-slate-500">Branch</label>
            <select id="branch" name="branch" defaultValue={requestedBranch === undefined ? "all" : String(requestedBranch)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All Branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
        )}
        {!isCashier && <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Apply</Button>}
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <header className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-wide text-slate-900">AZIZ POS</h2>
          <p className="text-sm font-medium text-slate-700">{branchTitle}</p>
          <p className="text-xs text-slate-500">
            Sales Summary · {inputDate(from)} to {inputDate(to)} · {isCashier ? `Cashier: ${user.name}` : "All cashiers"}
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-600">
                {["Invoice", "Date", "Branch", "Cashier", "Items", "Subtotal", "Discount", "Tax", "Total"].map((label) => (
                  <th key={label} className="border border-slate-300 px-3 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="border border-slate-300 px-3 py-2 font-mono text-xs">{sale.invoiceNumber}</td>
                  <td className="border border-slate-300 px-3 py-2">{dateTime(sale.createdAt)}</td>
                  <td className="border border-slate-300 px-3 py-2">{sale.branch.name}</td>
                  <td className="border border-slate-300 px-3 py-2">{sale.cashier.name}</td>
                  <td className="border border-slate-300 px-3 py-2 tabular-nums">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(sale.subtotal.toNumber())}</td>
                  <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(sale.discountAmount.toNumber())}</td>
                  <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(sale.taxAmount.toNumber())}</td>
                  <td className="border border-slate-300 px-3 py-2 font-medium tabular-nums">{money(sale.grandTotal.toNumber())}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={9} className="border border-slate-300 px-3 py-8 text-center text-slate-400">No sales in this period.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td colSpan={5} className="border border-slate-300 px-3 py-2 text-right">Totals ({sales.length} orders)</td>
                <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(totals.subtotal)}</td>
                <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(totals.discount)}</td>
                <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(totals.tax)}</td>
                <td className="border border-slate-300 px-3 py-2 tabular-nums">{money(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
