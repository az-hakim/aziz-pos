import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "users", label: "Users" },
  { key: "sales", label: "Sales" },
  { key: "isActive", label: "Active" },
];

const fields: CatalogField[] = [
  { key: "name", label: "Name" },
  { key: "code", label: "Code" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "isActive", label: "Active", type: "checkbox" },
];

export default async function BranchesPage() {
  await requireRole(["SUPER_ADMIN"]);
  const branches = await db.branch.findMany({
    include: { _count: { select: { users: true, sales: true } } },
    orderBy: { name: "asc" },
  });

  const rows = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address ?? "",
    phone: branch.phone ?? "",
    users: branch._count.users,
    sales: branch._count.sales,
    isActive: branch.isActive,
  }));

  return (
    <CatalogManager
      entity="branch"
      title="Branches"
      rows={rows}
      columns={columns}
      fields={fields}
      searchKeys={["name", "code", "phone"]}
    />
  );
}
