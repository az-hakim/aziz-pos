import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { getStoreSettings } from "@/lib/settings";
import { CatalogManager, type CatalogColumn, type CatalogField } from "@/components/catalog-manager";

const columns: CatalogColumn[] = [
  { key: "name", label: "Name" },
  { key: "sku", label: "SKU" },
  { key: "barcode", label: "Barcode" },
  { key: "categoryName", label: "Category" },
  { key: "brandName", label: "Brand" },
  { key: "unitName", label: "Unit" },
  { key: "costPrice", label: "Cost", currency: true },
  { key: "sellingPrice", label: "Price", currency: true },
  { key: "lowStockAlert", label: "Low Stock At" },
  { key: "isActive", label: "Active" },
];

export default async function ProductsPage() {
  await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const settings = await getStoreSettings();
  const [products, categories, brands, units] = await Promise.all([
    db.product.findMany({ orderBy: { name: "asc" } }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.unit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const option = (items: { id: number; name: string }[]) =>
    items.map((item) => ({ value: String(item.id), label: item.name }));

  const fields: CatalogField[] = [
    { key: "name", label: "Name" },
    { key: "sku", label: "SKU" },
    { key: "barcode", label: "Barcode" },
    { key: "categoryId", label: "Category", type: "select", options: option(categories) },
    { key: "brandId", label: "Brand", type: "select", options: option(brands) },
    { key: "unitId", label: "Unit", type: "select", options: option(units) },
    { key: "costPrice", label: "Cost Price (৳)", type: "number" },
    { key: "sellingPrice", label: "Selling Price (৳)", type: "number" },
    { key: "lowStockAlert", label: "Low Stock Alert", type: "number" },
    { key: "isActive", label: "Active", type: "checkbox" },
  ];

  const rows = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    brandId: product.brandId,
    unitId: product.unitId,
    categoryName: categories.find((c) => c.id === product.categoryId)?.name ?? "",
    brandName: brands.find((b) => b.id === product.brandId)?.name ?? "",
    unitName: units.find((u) => u.id === product.unitId)?.name ?? "",
    costPrice: product.costPrice.toNumber(),
    sellingPrice: product.sellingPrice.toNumber(),
    lowStockAlert: product.lowStockAlert,
    isActive: product.isActive,
  }));

  return (
    <CatalogManager
      entity="product"
      title="Products"
      rows={rows}
      columns={columns}
      fields={fields}
      searchKeys={["name", "sku", "barcode"]}
      storeName={settings.storeName}
    />
  );
}
