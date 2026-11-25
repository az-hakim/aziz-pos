import { Prisma, type StockMovementReason, type StockMovementType } from "@prisma/client";

export class InsufficientStockError extends Error {}

export type StockChange = {
  branchId: number;
  productId: number;
  userId: number;
  type: StockMovementType;
  reason: StockMovementReason;
  quantityChange: number;
  referenceNote?: string | null;
};

// Must be called inside db.$transaction so inventory and its audit row commit together.
export async function applyStockChange(tx: Prisma.TransactionClient, change: StockChange) {
  const key = { branchId_productId: { branchId: change.branchId, productId: change.productId } };

  if (change.quantityChange > 0) {
    await tx.branchInventory.upsert({
      where: key,
      create: {
        branchId: change.branchId,
        productId: change.productId,
        quantity: change.quantityChange,
      },
      update: { quantity: { increment: change.quantityChange } },
    });
  } else {
    const updated = await tx.branchInventory.updateMany({
      where: {
        branchId: change.branchId,
        productId: change.productId,
        quantity: { gte: -change.quantityChange },
      },
      data: { quantity: { decrement: -change.quantityChange } },
    });
    if (updated.count === 0) throw new InsufficientStockError("Insufficient stock for one or more products.");
  }

  const current = await tx.branchInventory.findUniqueOrThrow({ where: key });
  await tx.stockMovement.create({
    data: {
      branchId: change.branchId,
      productId: change.productId,
      userId: change.userId,
      type: change.type,
      reason: change.reason,
      quantityChange: change.quantityChange,
      previousQty: current.quantity - change.quantityChange,
      newQty: current.quantity,
      referenceNote: change.referenceNote ?? null,
    },
  });
  return current.quantity;
}
