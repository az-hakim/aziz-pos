import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { db } from "@/lib/db";
import { dateTime, money, round2 } from "@/lib/format";
import { DashboardCharts } from "@/components/dashboard-charts";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default async function DashboardPage() {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const branchId = await getBranchFilter(user);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(startOfToday);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    today,
    thisMonth,
    orders,
    inventory,
    productCount,
    branches,
    recentSales,
    trendRows,
    paymentRows,
    saleItems,
    branchRows,
  ] = await Promise.all([
    db.sale.aggregate({ where: { branchId, createdAt: { gte: startOfToday } }, _sum: { grandTotal: true } }),
    db.sale.aggregate({ where: { branchId, createdAt: { gte: startOfMonth } }, _sum: { grandTotal: true } }),
    db.sale.count({ where: { branchId } }),
    db.branchInventory.findMany({
      where: { branchId },
      include: {
        branch: { select: { name: true } },
        product: { select: { name: true, sku: true, lowStockAlert: true } },
      },
    }),
    db.product.count({ where: { isActive: true } }),
    db.branch.findMany({ select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
    db.sale.findMany({
      where: { branchId },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { name: true } },
        cashier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    db.sale.findMany({
      where: { branchId, createdAt: { gte: weekStart } },
      select: { createdAt: true, grandTotal: true },
    }),
    db.sale.groupBy({ by: ["paymentMethod"], where: { branchId }, _sum: { grandTotal: true } }),
    db.saleItem.findMany({
      where: { sale: { branchId } },
      select: { quantity: true, product: { select: { name: true } } },
    }),
    db.sale.groupBy({ by: ["branchId"], where: { branchId }, _sum: { grandTotal: true } }),
  ]);

  const lowStock = inventory.filter((row) => row.quantity <= row.product.lowStockAlert);

  const kpis = [
    { label: "Today's Sales", value: money(today._sum.grandTotal?.toNumber() ?? 0) },
    { label: "This Month's Sales", value: money(thisMonth._sum.grandTotal?.toNumber() ?? 0) },
    { label: "Low Stock Items", value: String(lowStock.length) },
    { label: "Total Products", value: String(productCount) },
    {
      label: "Active Branches",
      value: String(branchId === undefined ? branches.filter((branch) => branch.isActive).length : 1),
    },
    { label: "Total Orders", value: String(orders) },
  ];

  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfToday);
    day.setDate(day.getDate() - (6 - index));
    return { key: dayKey(day), date: dayKey(day).slice(5), sales: 0 };
  });
  const trendMap = new Map(trend.map((point) => [point.key, point]));
  for (const sale of trendRows) {
    const point = trendMap.get(dayKey(sale.createdAt));
    if (point) point.sales = round2(point.sales + sale.grandTotal.toNumber());
  }

  const topCounts = new Map<string, number>();
  for (const item of saleItems) {
    topCounts.set(item.product.name, (topCounts.get(item.product.name) ?? 0) + item.quantity);
  }
  const topProducts = [...topCounts]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const branchSales = new Map(
    branchRows.map((row) => [row.branchId, row._sum.grandTotal?.toNumber() ?? 0]),
  );
  const branchPerformance = branches.map((branch) => ({
    name: branch.name,
    sales: branchSales.get(branch.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live overview of sales and stock across your branches.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">{kpi.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{kpi.value}</div>
          </div>
        ))}
      </div>

      <DashboardCharts
        trend={trend.map(({ date, sales }) => ({ date, sales }))}
        payments={paymentRows.map((row) => ({
          name: row.paymentMethod.replace("_", " "),
          value: row._sum.grandTotal?.toNumber() ?? 0,
        }))}
        topProducts={topProducts}
        branches={branchPerformance}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900">
            Low Stock Alerts
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-5 py-2 font-medium">Product</th><th className="px-5 py-2 font-medium">Branch</th><th className="px-5 py-2 font-medium">Qty</th></tr>
            </thead>
            <tbody>
              {lowStock.slice(0, 6).map((row) => (
                <tr key={row.id ?? `${row.branchId}-${row.productId}`} className="border-t border-slate-100 bg-amber-50">
                  <td className="px-5 py-2">{row.product.name}<span className="ml-2 font-mono text-xs text-slate-400">{row.product.sku}</span></td>
                  <td className="px-5 py-2">{row.branch.name}</td>
                  <td className="px-5 py-2 font-medium tabular-nums">{row.quantity} / {row.product.lowStockAlert}</td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">All stocked items are above their alert level.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900">Recent Sales</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-5 py-2 font-medium">Invoice</th><th className="px-5 py-2 font-medium">Date</th><th className="px-5 py-2 font-medium">Total</th></tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id} className="border-t border-slate-100">
                  <td className="px-5 py-2 font-mono text-xs">{sale.invoiceNumber}</td>
                  <td className="px-5 py-2 text-slate-500">{dateTime(sale.createdAt)}</td>
                  <td className="px-5 py-2 font-medium tabular-nums">{money(sale.grandTotal.toNumber())}</td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No sales recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
