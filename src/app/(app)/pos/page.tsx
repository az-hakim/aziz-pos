import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { db } from "@/lib/db";
import { getStoreSettings } from "@/lib/settings";
import { PosTerminal, type PosProduct } from "@/components/pos-terminal";

export default async function PosPage() {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER", "CASHIER"]);
  const branchId = await getBranchFilter(user);
  const settings = await getStoreSettings();

  const [branch, products] = branchId === undefined
    ? [null, []]
    : await Promise.all([
        db.branch.findUnique({ where: { id: branchId }, select: { name: true, code: true } }),
        db.product.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            sellingPrice: true,
            unit: { select: { shortName: true } },
            inventory: { where: { branchId }, select: { quantity: true }, take: 1 },
          },
          orderBy: { name: "asc" },
        }),
      ]);

  const rows: PosProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    price: product.sellingPrice.toNumber(),
    unit: product.unit.shortName,
    stock: product.inventory[0]?.quantity ?? 0,
  }));

  return (
    <div key={branchId ?? "all"}>
      <PosTerminal
        products={rows}
        branchName={branch?.name ?? "No branch selected"}
        cashierName={user.name ?? "Cashier"}
        needsBranch={branchId === undefined}
        store={settings}
      />
    </div>
  );
}
