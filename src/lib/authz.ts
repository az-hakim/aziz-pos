import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function requireRole(roles: Role[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!roles.includes(session.user.role)) {
    redirect(session.user.role === "CASHIER" ? "/pos" : "/");
  }

  // Re-check the DB so deactivating an employee kills their existing JWT session.
  const active = await db.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { isActive: true },
  });
  if (!active?.isActive) redirect("/login");

  return session.user;
}
