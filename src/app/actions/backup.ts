"use server";

import { revalidatePath } from "next/cache";
import { runBackupSyncAllBrands } from "@/lib/backup";

export async function syncBackupNow() {
  await runBackupSyncAllBrands();
  revalidatePath("/");
}
