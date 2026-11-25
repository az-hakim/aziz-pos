import { db } from "@/lib/db";

export const defaultStoreSettings = {
  storeName: "AZIZ POS",
  tagline: "Run every branch from one counter.",
  address: "",
  phone: "",
  email: "",
  receiptFooter: "Thank you for shopping with us!",
};

export type StoreSettingsView = typeof defaultStoreSettings;

// Falls back to defaults so build/render never breaks on a missing DB or row.
export async function getStoreSettings(): Promise<StoreSettingsView> {
  try {
    const row = await db.storeSettings.findUnique({ where: { id: 1 } });
    if (!row) return defaultStoreSettings;
    return {
      storeName: row.storeName,
      tagline: row.tagline,
      address: row.address,
      phone: row.phone,
      email: row.email,
      receiptFooter: row.receiptFooter,
    };
  } catch {
    return defaultStoreSettings;
  }
}
