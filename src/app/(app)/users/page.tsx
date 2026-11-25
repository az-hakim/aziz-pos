import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "branchName", label: "Branch" },
];

export default async function UsersPage() {
  await requireRole(["SUPER_ADMIN"]);
  const [users, branches] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true, email: true, role: true, branchId: true }, orderBy: { name: "asc" } }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const fields: CatalogField[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
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
    { key: "password", label: "Password (blank keeps current)", type: "password" },
  ];

  const rows = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    branchName: branches.find((branch) => branch.id === user.branchId)?.name ?? "—",
  }));

  return (
    <CatalogManager
      entity="user"
      title="Users"
      rows={rows}
      columns={columns}
      fields={fields}
      searchKeys={["name", "email", "branchName"]}
    />
  );
}
