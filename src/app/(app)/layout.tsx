import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const branchCookie = (await cookies()).get("branchId")?.value;
  const selectedBranch =
    session.user.role === "SUPER_ADMIN" && branchCookie && branchCookie !== "all" && Number.isInteger(Number(branchCookie))
      ? Number(branchCookie)
      : "all";

  // Only super admins may choose an active branch; other roles are locked to their own.
  const branches =
    session.user.role === "SUPER_ADMIN"
      ? await db.branch.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <AppShell
      key={String(selectedBranch)}
      initialBranchId={
        session.user.role === "SUPER_ADMIN" ? selectedBranch : (session.user.branchId ?? "all")
      }
      user={{
        name: session.user.name ?? "User",
        role: session.user.role,
        branchId: session.user.branchId,
      }}
      branches={branches}
    >
      {children}
    </AppShell>
  );
}
