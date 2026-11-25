import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { db } from "@/lib/db";
import { StockForm } from "@/components/stock-form";

export default async function CheckInPage() {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const branchId = await getBranchFilter(user);
  const isAdmin = user.role === "SUPER_ADMIN";

  const [branches, products, assignedBranch] = await Promise.all([
    isAdmin
      ? db.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    !isAdmin && user.branchId
      ? db.branch.findUnique({ where: { id: user.branchId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  return (
    <StockForm
      type="IN"
      branches={branches}
      products={products}
      fixedBranchId={isAdmin ? undefined : (user.branchId ?? undefined)}
      fixedBranchName={assignedBranch?.name}
      key={branchId ?? "all"}
    />
  );
}
