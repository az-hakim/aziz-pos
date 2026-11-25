import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
];

const fields: CatalogField[] = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
];

export default async function CategoriesPage() {
  await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <CatalogManager
      entity="category"
      title="Categories"
      rows={categories}
      columns={columns}
      fields={fields}
      searchKeys={["name", "slug"]}
    />
  );
}
