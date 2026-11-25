"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { hashPassword } from "@/lib/password";
import type { CatalogEntity } from "@/lib/catalog";

class ActionError extends Error {}

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
const branchSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1).regex(/^[a-z0-9-]+$/i, "Use letters, numbers and hyphens"),
  address: z.string().trim(),
  phone: z.string().trim(),
  isActive: z.boolean(),
});
const userSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string().trim(),
    role: z.enum(["SUPER_ADMIN", "BRANCH_MANAGER", "CASHIER"]),
    branchId: z.coerce.number().int().nonnegative().transform((value) => (value === 0 ? null : value)),
    isActive: z.boolean(),
    password: z.string(),
  })
  .refine((value) => !value.password || value.password.length >= 8, {
    message: "Password must be at least 8 characters.",
    path: ["password"],
  })
  .refine((value) => value.role === "SUPER_ADMIN" || value.branchId !== null, {
    message: "Assign a branch for managers and cashiers.",
    path: ["branchId"],
  });

const routes: Record<CatalogEntity, string> = {
  category: "/categories",
  brand: "/brands",
  unit: "/units",
  product: "/products",
  branch: "/branches",
  user: "/users",
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
  branch: async (values, id) => {
    const data = branchSchema.parse(values);
    if (id) await db.branch.update({ where: { id }, data });
    else await db.branch.create({ data });
  },
  user: async (values, id) => {
    const data = userSchema.parse(values);
    const { password, ...profile } = data;
    if (id === null) {
      if (!password) throw new ActionError("Password is required for a new user.");
      await db.user.create({ data: { ...profile, passwordHash: hashPassword(password) } });
      return;
    }
    await db.user.update({
      where: { id },
      data: { ...profile, ...(password ? { passwordHash: hashPassword(password) } : {}) },
    });
  },
};

const deleters: Record<CatalogEntity, (id: number) => Promise<void>> = {
  category: (id) => db.category.delete({ where: { id } }).then(() => undefined),
  brand: (id) => db.brand.delete({ where: { id } }).then(() => undefined),
  unit: (id) => db.unit.delete({ where: { id } }).then(() => undefined),
  product: (id) => db.product.delete({ where: { id } }).then(() => undefined),
  branch: (id) => db.branch.delete({ where: { id } }).then(() => undefined),
  user: (id) => db.user.delete({ where: { id } }).then(() => undefined),
};

const adminOnly = (entity: CatalogEntity) => entity === "branch" || entity === "user";

export async function saveCatalogItem(
  entity: CatalogEntity,
  id: number | null,
  values: unknown,
): Promise<Result> {
  const user = await requireRole(adminOnly(entity) ? ["SUPER_ADMIN"] : ["SUPER_ADMIN", "BRANCH_MANAGER"]);
  if (entity === "user" && id === Number(user.id) && (values as { isActive?: unknown }).isActive === false) {
    return { error: "You cannot deactivate your own account." };
  }
  try {
    await writers[entity](values, id);
  } catch (error) {
    return {
      error:
        error instanceof ActionError
          ? error.message
          : "Could not save. Check the fields and unique values (SKU, barcode, slug, email, code).",
    };
  }
  revalidatePath(routes[entity]);
  revalidatePath("/");
  return {};
}

export async function deleteCatalogItem(entity: CatalogEntity, id: number): Promise<Result> {
  const user = await requireRole(adminOnly(entity) ? ["SUPER_ADMIN"] : ["SUPER_ADMIN", "BRANCH_MANAGER"]);
  if (entity === "user" && Number(user.id) === id) {
    return { error: "You cannot delete your own account." };
  }
  try {
    await deleters[entity](id);
  } catch {
    return { error: "Cannot delete while other records still reference this item." };
  }
  revalidatePath(routes[entity]);
  revalidatePath("/");
  return {};
}
