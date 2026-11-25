"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Boxes,
  Building2,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  type LucideProps,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { BranchProvider, useBranch, type BranchSelection } from "./branch-context";
import { SignOutButton } from "./sign-out-button";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<LucideProps>;
  roles: Role[];
  group?: string;
};

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"] },
  { label: "POS", href: "/pos", icon: ShoppingCart, roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "CASHIER"] },
  { label: "Categories", href: "/categories", icon: Tags, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Catalog" },
  { label: "Brands", href: "/brands", icon: Boxes, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Catalog" },
  { label: "Units", href: "/units", icon: Package, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Catalog" },
  { label: "Products", href: "/products", icon: Package, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Catalog" },
  { label: "Current Stock", href: "/inventory", icon: Warehouse, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Inventory" },
  { label: "Stock In", href: "/inventory/check-in", icon: ArrowDownCircle, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Inventory" },
  { label: "Stock Out", href: "/inventory/check-out", icon: ArrowUpCircle, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Inventory" },
  { label: "Branches", href: "/branches", icon: Building2, roles: ["SUPER_ADMIN"] },
  { label: "Users", href: "/users", icon: Users, roles: ["SUPER_ADMIN"] },
  { label: "Sales Summary", href: "/reports/sales-summary", icon: BarChart3, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Reports" },
  { label: "Stock Movement", href: "/reports/stock-movement", icon: FileText, roles: ["SUPER_ADMIN", "BRANCH_MANAGER"], group: "Reports" },
  { label: "My Shift Sales", href: "/reports/sales-summary", icon: BarChart3, roles: ["CASHIER"], group: "Reports" },
];

export function AppShell({
  user,
  branches,
  children,
}: {
  user: { name: string; role: Role; branchId: number | null };
  branches: { id: number; name: string }[];
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const initialBranchId: BranchSelection =
    user.role === "SUPER_ADMIN" ? "all" : (user.branchId ?? "all");
  const visibleItems = navigation.filter((item) => item.roles.includes(user.role));

  return (
    <BranchProvider initialBranchId={initialBranchId}>
      <div className="flex min-h-screen bg-slate-50">
        <aside
          className={`${collapsed ? "w-16" : "w-64"} flex shrink-0 flex-col bg-slate-900 text-slate-200 transition-all`}
        >
          <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-4">
            <span className="text-sm font-bold tracking-widest text-white">
              {collapsed ? "AZ" : "AZIZ POS"}
            </span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {visibleItems.map((item, index) => {
              const showGroup = item.group && item.group !== visibleItems[index - 1]?.group;
              return (
                <Fragment key={`${item.group ?? "main"}-${item.label}`}>
                  {showGroup && !collapsed && (
                    <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.group}
                    </div>
                  )}
                  <NavLink item={item} collapsed={collapsed} />
                </Fragment>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((value) => !value)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4">
              {user.role === "SUPER_ADMIN" ? (
                <BranchSelect branches={branches} />
              ) : (
                <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                  {branches.find((branch) => branch.id === user.branchId)?.name ??
                    "Assigned branch"}
                </span>
              )}
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role.replace("_", " ")}</div>
              </div>
              <SignOutButton />
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </BranchProvider>
  );
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      prefetch={false}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function BranchSelect({ branches }: { branches: { id: number; name: string }[] }) {
  const { branchId, setBranchId } = useBranch();

  return (
    <select
      aria-label="Active branch"
      value={branchId}
      onChange={(event) =>
        setBranchId(event.target.value === "all" ? "all" : Number(event.target.value))
      }
      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
    >
      <option value="all">All Branches</option>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}
