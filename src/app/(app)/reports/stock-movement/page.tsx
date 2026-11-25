import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
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

export default async function StockMovementPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const settings = await getStoreSettings();
  const params = await searchParams;
  const get = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = dateParam(get("from"), new Date(now.getFullYear(), now.getMonth(), 1));
  const to = dateParam(get("to"), today);
  const exclusiveTo = new Date(to.getTime() + 24 * 60 * 60 * 1000);
  const typeParam = get("type");
  const type = typeParam === "IN" || typeParam === "OUT" ? typeParam : undefined;

  const requestedBranch = await getBranchFilter(user);
  const branches = await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  let branchId = requestedBranch;
  if (user.role === "SUPER_ADMIN" && get("branch")) {
    const selected = get("branch");
    branchId = selected === "all" ? undefined : Number(selected);
    if (branchId !== undefined && !branches.some((branch) => branch.id === branchId)) branchId = undefined;
  }
  const activeBranch = branches.find((branch) => branch.id === branchId);
  const branchTitle = activeBranch?.name ?? "All Branches";

  const movements = await db.stockMovement.findMany({
    where: {
      branchId,
      createdAt: { gte: from, lt: exclusiveTo },
      ...(type ? { type } : {}),
    },
    include: {
      branch: { select: { name: true } },
      product: { select: { name: true, sku: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const inQty = movements.reduce((sum, row) => sum + (row.type === "IN" ? row.quantityChange : 0), 0);
  const outQty = movements.reduce((sum, row) => sum + (row.type === "OUT" ? -row.quantityChange : 0), 0);

  return (
    <div className="print-ledger space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Stock Movement</h1>
          <p className="text-sm text-slate-500">Auditable log of every stock adjustment.</p>
        </div>
        <PrintButton />
      </div>

      <form method="get" className="no-print flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <label htmlFor="from" className="block text-xs text-slate-500">From</label>
          <input id="from" name="from" type="date" defaultValue={inputDate(from)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="block text-xs text-slate-500">To</label>
          <input id="to" name="to" type="date" defaultValue={inputDate(to)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" />
        </div>
        {user.role === "SUPER_ADMIN" && (
          <div className="space-y-1">
            <label htmlFor="branch" className="block text-xs text-slate-500">Branch</label>
            <select id="branch" name="branch" defaultValue={requestedBranch === undefined ? "all" : String(requestedBranch)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All Branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="type" className="block text-xs text-slate-500">Movement</label>
          <select id="type" name="type" defaultValue={type ?? "all"} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="all">All Types</option>
            <option value="IN">Stock In</option>
            <option value="OUT">Stock Out</option>
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">Apply</button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <header className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-wide text-slate-900">{settings.storeName}</h2>
          <p className="text-sm font-medium text-slate-700">{branchTitle}</p>
          {(settings.address || settings.phone || settings.email) && (
            <p className="text-xs text-slate-500">{[settings.address, settings.phone, settings.email].filter(Boolean).join(" · ")}</p>
          )}
          <p className="text-xs text-slate-500">
            Stock Movement · {inputDate(from)} to {inputDate(to)} · {type ? `${type} only` : "All movements"}
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-600">
                {["Date", "Branch", "Product", "SKU", "Type", "Reason", "Change", "Before", "After", "User", "Note"].map((label) => (
                  <th key={label} className="border border-slate-300 px-3 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-300 px-3 py-2">{dateTime(row.createdAt)}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.branch.name}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.product.name}</td>
                  <td className="border border-slate-300 px-3 py-2 font-mono text-xs">{row.product.sku}</td>
                  <td className="border border-slate-300 px-3 py-2 font-medium">{row.type}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.reason.replaceAll("_", " ")}</td>
                  <td className={`border border-slate-300 px-3 py-2 tabular-nums ${row.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                    {row.type === "IN" ? "+" : ""}{row.quantityChange}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 tabular-nums">{row.previousQty}</td>
                  <td className="border border-slate-300 px-3 py-2 tabular-nums">{row.newQty}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.user.name}</td>
                  <td className="border border-slate-300 px-3 py-2">{row.referenceNote ?? ""}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr><td colSpan={11} className="border border-slate-300 px-3 py-8 text-center text-slate-400">No movements in this period.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <td colSpan={6} className="border border-slate-300 px-3 py-2 text-right">Totals ({movements.length} movements)</td>
                <td className="border border-slate-300 px-3 py-2 tabular-nums">+{inQty} / -{outQty}</td>
                <td colSpan={4} className="border border-slate-300 px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
