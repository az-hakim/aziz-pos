import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [
  { key: "name", label: "Name" },
  { key: "shortName", label: "Short Name" },
];

const fields: CatalogField[] = [
  { key: "name", label: "Name" },
  { key: "shortName", label: "Short Name" },
];

export default async function UnitsPage() {
  await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const units = await db.unit.findMany({ orderBy: { name: "asc" } });

  return (
    <CatalogManager
      entity="unit"
      title="Units"
      rows={units}
      columns={columns}
      fields={fields}
      searchKeys={["name", "shortName"]}
    />
  );
}
