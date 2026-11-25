"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";

const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required."),
  tagline: z.string().trim().min(1, "Tagline is required."),
  address: z.string().trim(),
  phone: z.string().trim(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]),
  receiptFooter: z.string().trim().min(1, "Receipt footer is required."),
});

type Result = { error?: string };

export async function saveSettings(values: unknown): Promise<Result> {
  await requireRole(["SUPER_ADMIN"]);
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid settings." };

  await db.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath("/", "layout");
  return {};
}
