import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "role", label: "Role" },
  { key: "branchName", label: "Branch" },
  { key: "status", label: "Status" },
  { key: "salesCount", label: "Sales" },
  { key: "movementCount", label: "Stock Logs" },
  { key: "joined", label: "Joined" },
];

export default async function UsersPage() {
  await requireRole(["SUPER_ADMIN"]);
  const [users, branches] = await Promise.all([
    db.user.findMany({
      include: { branch: { select: { name: true } }, _count: { select: { sales: true, stockMovements: true } } },
      orderBy: { name: "asc" },
    }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const fields: CatalogField[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: "SUPER_ADMIN", label: "Super Admin" },
        { value: "BRANCH_MANAGER", label: "Branch Manager" },
        { value: "CASHIER", label: "Cashier" },
      ],
    },
    {
      key: "branchId",
      label: "Branch",
      type: "select",
      options: [
        { value: "", label: "No branch (Super Admin only)" },
        ...branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
      ],
    },
    { key: "isActive", label: "Active (uncheck to suspend)", type: "checkbox" },
    { key: "password", label: "Password (blank keeps current)", type: "password" },
  ];

  const rows = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    branchId: user.branchId,
    branchName: user.branch?.name ?? "—",
    isActive: user.isActive,
    status: user.isActive ? "Active" : "Suspended",
    salesCount: user._count.sales,
    movementCount: user._count.stockMovements,
    joined: dateTime(user.createdAt),
  }));

  return (
    <CatalogManager
      entity="user"
      title="Employees"
      rows={rows}
      columns={columns}
      fields={fields}
      searchKeys={["name", "email", "phone", "branchName"]}
    />
  );
}
