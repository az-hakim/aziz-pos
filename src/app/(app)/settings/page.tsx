import { requireRole } from "@/lib/authz";
import { getStoreSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  await requireRole(["SUPER_ADMIN"]);
  const settings = await getStoreSettings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Store Settings</h1>
        <p className="text-sm text-slate-500">Branding and text shown on receipts, ledgers and login.</p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
