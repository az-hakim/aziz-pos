import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export type SessionUser = { role: Role; branchId: number | null };

// undefined means "all branches"; non-admins are always pinned to their own branch.
export async function getBranchFilter(user: SessionUser): Promise<number | undefined> {
  if (user.role !== "SUPER_ADMIN") return user.branchId ?? -1;
  const value = (await cookies()).get("branchId")?.value;
  if (!value || value === "all") return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}
