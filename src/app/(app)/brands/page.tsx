import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [{ key: "name", label: "Name" }];
const fields: CatalogField[] = [{ key: "name", label: "Name" }];

export default async function BrandsPage() {
  await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const brands = await db.brand.findMany({ orderBy: { name: "asc" } });

  return (
    <CatalogManager
      entity="brand"
      title="Brands"
      rows={brands}
      columns={columns}
      fields={fields}
      searchKeys={["name"]}
    />
  );
}
