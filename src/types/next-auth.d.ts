import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    branchId: number | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    branchId: number | null;
  }
}
