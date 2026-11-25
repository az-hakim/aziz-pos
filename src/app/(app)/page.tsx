import { requireRole } from "@/lib/authz";
import { getStoreSettings } from "@/lib/settings";

export default async function Home() {
  const user = await requireRole(["SUPER_ADMIN", "BRANCH_MANAGER", "CASHIER"]);
  const settings = await getStoreSettings();

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold text-slate-900">{settings.storeName}</h1>
      <p className="text-slate-500">Signed in as {user.name} · {user.role}</p>
    </div>
  );
}
