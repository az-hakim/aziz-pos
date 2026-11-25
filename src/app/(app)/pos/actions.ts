"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { getBranchFilter } from "@/lib/branch";
import { applyStockChange, InsufficientStockError } from "@/lib/stock";
import { round2 } from "@/lib/format";

class CheckoutError extends Error {}

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive().max(1000),
      }),
    )
    .min(1),
  discountType: z.enum(["FLAT", "PERCENT"]),
  discountValue: z.number().nonnegative(),
  taxPercent: z.number().nonnegative().max(100),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_BANKING"]),
  amountPaid: z.number().nonnegative(),
});

export type ReceiptData = {
  invoiceNumber: string;
  createdAt: string;
  branchName: string;
  cashierName: string;
  paymentMethod: string;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  changeReturned: number;
};

type Result = { error?: string; sale?: ReceiptData };

export async function checkout(values: unknown): Promise<Result> {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER", "CASHIER"]);
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid order." };
  const data = parsed.data;

  const branchId = await getBranchFilter(user);
  if (branchId === undefined) return { error: "Select a branch in the header before checkout." };

  try {
    const sale = await db.$transaction(async (tx) => {
      const ids = data.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, name: true, sellingPrice: true },
      });
      if (products.length !== new Set(ids).size) throw new CheckoutError("One or more products are unavailable.");
      const byId = new Map(products.map((product) => [product.id, product]));

      // Snapshot prices here; later product price edits must not change this invoice.
      const items = data.items.map((item) => {
        const product = byId.get(item.productId)!;
        const unitPrice = product.sellingPrice.toNumber();
        return {
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice: round2(unitPrice * item.quantity),
        };
      });
      const subtotal = round2(items.reduce((sum, item) => sum + item.totalPrice, 0));
      const discountAmount = round2(
        data.discountType === "FLAT" ? Math.min(data.discountValue, subtotal) : (subtotal * data.discountValue) / 100,
      );
      const taxAmount = round2(((subtotal - discountAmount) * data.taxPercent) / 100);
      const grandTotal = round2(subtotal - discountAmount + taxAmount);
      if (data.amountPaid < grandTotal) throw new CheckoutError("Cash tendered is less than the grand total.");
      const changeReturned = round2(data.amountPaid - grandTotal);

      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const created = await tx.sale.create({
        data: {
          invoiceNumber,
          branchId,
          cashierId: Number(user.id),
          subtotal,
          discountAmount,
          taxAmount,
          grandTotal,
          paymentMethod: data.paymentMethod,
          amountPaid: data.amountPaid,
          changeReturned,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: { branch: { select: { name: true } }, cashier: { select: { name: true } } },
      });

      for (const item of items) {
        await applyStockChange(tx, {
          branchId,
          productId: item.productId,
          userId: Number(user.id),
          type: "OUT",
          reason: "SALE",
          quantityChange: -item.quantity,
          referenceNote: invoiceNumber,
        });
      }

      return {
        invoiceNumber: created.invoiceNumber,
        createdAt: created.createdAt.toISOString(),
        branchName: created.branch.name,
        cashierName: created.cashier.name,
        paymentMethod: created.paymentMethod,
        items: items.map(({ name, quantity, unitPrice, totalPrice }) => ({
          name,
          quantity,
          unitPrice,
          totalPrice,
        })),
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        amountPaid: data.amountPaid,
        changeReturned,
      };
    });

    revalidatePath("/pos");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports/sales-summary");
    revalidatePath("/reports/stock-movement");
    return { sale };
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof CheckoutError) {
      return { error: error.message };
    }
    return { error: "Checkout failed. Please review the order and try again." };
  }
}
