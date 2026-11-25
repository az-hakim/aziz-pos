"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { applyStockChange, InsufficientStockError } from "@/lib/stock";

const inReasons = ["OPENING_STOCK", "PURCHASE", "TRANSFER_IN", "SALE_RETURN"];
const outReasons = ["PURCHASE_RETURN", "DAMAGE", "EXPIRED", "TRANSFER_OUT"];

const stockSchema = z
  .object({
    type: z.enum(["IN", "OUT"]),
    branchId: z.coerce.number().int().positive(),
    productId: z.coerce.number().int().positive(),
    reason: z.enum([
      ...inReasons,
      ...outReasons,
    ] as [string, ...string[]]),
    quantity: z.coerce.number().int().positive().max(1000000),
    note: z.string().trim().max(200).optional().default(""),
  })
  .refine(
    (value) => (value.type === "IN" ? inReasons : outReasons).includes(value.reason),
    { message: "Reason does not match the stock direction.", path: ["reason"] },
  );

export async function adjustStock(values: unknown): Promise<{ error?: string }> {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER"]);
  const parsed = stockSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid stock entry." };
  const data = parsed.data;

  const allowedBranch = await getBranchFilter(user);
  if (allowedBranch !== undefined && data.branchId !== allowedBranch) {
    return { error: "You can only change stock in your assigned branch." };
  }

  try {
    await db.$transaction(async (tx) => {
      await applyStockChange(tx, {
        branchId: data.branchId,
        productId: data.productId,
        userId: Number(user.id),
        type: data.type,
        reason: data.reason as Parameters<typeof applyStockChange>[1]["reason"],
        quantityChange: data.type === "IN" ? data.quantity : -data.quantity,
        referenceNote: data.note || null,
      });
    });
  } catch (error) {
    return {
      error: error instanceof InsufficientStockError ? error.message : "Could not update stock.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/reports/stock-movement");
  return {};
}
