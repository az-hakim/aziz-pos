import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { db } from "@/lib/db";
import { InventoryTable, type InventoryRow } from "@/components/inventory-table";

export default async function InventoryPage() {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const branchId = await getBranchFilter(user);

  const [inventory, products] = await Promise.all([
    db.branchInventory.findMany({
      where: { branchId },
      include: {
        branch: { select: { name: true } },
        product: {
          select: {
            name: true,
            sku: true,
            barcode: true,
            lowStockAlert: true,
            unit: { select: { shortName: true } },
          },
        },
      },
      orderBy: [{ branch: { name: "asc" } }, { product: { name: "asc" } }],
    }),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, barcode: true, lowStockAlert: true, unit: { select: { shortName: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: InventoryRow[] = inventory.map((row) => ({
    id: row.id,
    branch: row.branch.name,
    productId: row.productId,
    product: row.product.name,
    sku: row.product.sku,
    barcode: row.product.barcode,
    unit: row.product.unit.shortName,
    quantity: row.quantity,
    lowStockAlert: row.product.lowStockAlert,
  }));

  // A product with no inventory row is genuinely out of stock, not invisible.
  if (branchId !== undefined) {
    const stocked = new Set(rows.map((row) => row.productId));
    const branch = await db.branch.findUnique({ where: { id: branchId }, select: { name: true } });
    for (const product of products) {
      if (stocked.has(product.id)) continue;
      rows.push({
        id: -product.id,
        branch: branch?.name ?? "",
        productId: product.id,
        product: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unit: product.unit.shortName,
        quantity: 0,
        lowStockAlert: product.lowStockAlert,
      });
    }
  }

  return <InventoryTable rows={rows} />;
}
