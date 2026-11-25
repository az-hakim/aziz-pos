"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings } from "@/app/(app)/settings/actions";
import type { StoreSettingsView } from "@/lib/settings";

const fields: { key: keyof StoreSettingsView; label: string; hint?: string }[] = [
  { key: "storeName", label: "Store name" },
  { key: "tagline", label: "Login tagline" },
  { key: "address", label: "Address", hint: "Printed on receipts and ledgers" },
  { key: "phone", label: "Phone", hint: "Printed on receipts and ledgers" },
  { key: "email", label: "Email" },
  { key: "receiptFooter", label: "Receipt footer" },
];

export function SettingsForm({ initial }: { initial: StoreSettingsView }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    const result = await saveSettings(values);
    if (result.error) {
      setError(result.error);
      setSaved(false);
      return;
    }
    setError(null);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`setting-${field.key}`}>{field.label}</Label>
          <Input
            id={`setting-${field.key}`}
            value={values[field.key]}
            onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
          />
          {field.hint && <p className="text-xs text-slate-500">{field.hint}</p>}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Settings saved.</p>}
      <Button onClick={save} className="bg-blue-600 hover:bg-blue-700">Save settings</Button>
    </div>
  );
}
