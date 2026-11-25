"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import type { CatalogEntity } from "@/lib/catalog";

const categorySchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
});
const brandSchema = z.object({ name: z.string().trim().min(1) });
const unitSchema = z.object({
  name: z.string().trim().min(1),
  shortName: z.string().trim().min(1),
});
const productSchema = z.object({
  name: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  barcode: z.string().trim().min(1),
  categoryId: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive(),
  unitId: z.coerce.number().int().positive(),
  costPrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  lowStockAlert: z.coerce.number().int().nonnegative(),
  isActive: z.boolean(),
});

const routes: Record<CatalogEntity, string> = {
  category: "/categories",
  brand: "/brands",
  unit: "/units",
  product: "/products",
};

type Result = { error?: string };

const writers: Record<CatalogEntity, (values: unknown, id: number | null) => Promise<void>> = {
  category: async (values, id) => {
    const data = categorySchema.parse(values);
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
  },
  brand: async (values, id) => {
    const data = brandSchema.parse(values);
    if (id) await db.brand.update({ where: { id }, data });
    else await db.brand.create({ data });
  },
  unit: async (values, id) => {
    const data = unitSchema.parse(values);
    if (id) await db.unit.update({ where: { id }, data });
    else await db.unit.create({ data });
  },
  product: async (values, id) => {
    const data = productSchema.parse(values);
    if (id) await db.product.update({ where: { id }, data });
    else await db.product.create({ data });
  },
};

const deleters: Record<CatalogEntity, (id: number) => Promise<void>> = {
  category: (id) => db.category.delete({ where: { id } }).then(() => undefined),
  brand: (id) => db.brand.delete({ where: { id } }).then(() => undefined),
  unit: (id) => db.unit.delete({ where: { id } }).then(() => undefined),
  product: (id) => db.product.delete({ where: { id } }).then(() => undefined),
};

export async function saveCatalogItem(
  entity: CatalogEntity,
  id: number | null,
  values: unknown,
): Promise<Result> {
  await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  try {
    await writers[entity](values, id);
  } catch {
    return { error: "Could not save. Check the fields and unique values (SKU, barcode, slug)." };
  }
  revalidatePath(routes[entity]);
  return {};
}

export async function deleteCatalogItem(entity: CatalogEntity, id: number): Promise<Result> {
  await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  try {
    await deleters[entity](id);
  } catch {
    return { error: "Cannot delete while other records still reference this item." };
  }
  revalidatePath(routes[entity]);
  return {};
}
