"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type BranchSelection = number | "all";

const BranchContext = createContext<{
  branchId: BranchSelection;
  setBranchId: (branchId: BranchSelection) => void;
} | null>(null);

export function BranchProvider({
  initialBranchId,
  children,
}: {
  initialBranchId: BranchSelection;
  children: ReactNode;
}) {
  const [branchId, setBranchIdState] = useState(initialBranchId);
  const router = useRouter();
  const firstRender = useRef(true);

  // Server components read this cookie when they need the active branch.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    router.refresh();
  }, [branchId, router]);

  function setBranchId(value: BranchSelection) {
    setBranchIdState(value);
    document.cookie = `branchId=${value}; path=/; SameSite=Lax`;
  }

  return (
    <BranchContext.Provider value={{ branchId, setBranchId }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used inside BranchProvider");
  return context;
}
