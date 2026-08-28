"use server";

import { revalidatePath } from "next/cache";
import { runBackupSyncBrands } from "@/lib/backup";
import { type Brand } from "@/lib/brand";

// One brand per call: a single brand's full sync (Drive archive + 18
// Sheets tabs) already runs close to the Hobby 60s function ceiling this
// action inherits from its page, so the "Sync now" button fires one of
// these per brand rather than both at once (see runBackupSyncBrands).
export async function syncBackupNow(brand: Brand) {
  await runBackupSyncBrands([brand]);
  revalidatePath("/");
}
