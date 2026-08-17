import { createClient } from "@/lib/supabase/server";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/brand";

export type BrandBackupStatus = {
  brand: Brand;
  label: string;
  lastSyncedAt: string | null;
  isFailing: boolean;
};

// Section 17: "if it fails twice, surface a small visible warning."
export async function getBackupStatuses(): Promise<BrandBackupStatus[]> {
  const supabase = await createClient();

  return Promise.all(
    BRANDS.map(async (brand) => {
      const { data } = await supabase
        .from("backup_log")
        .select("status, created_at")
        .eq("brand", brand)
        .eq("layer", "sheets")
        .order("created_at", { ascending: false })
        .limit(2);

      const attempts = data ?? [];
      const lastSuccess = attempts.find((a) => a.status === "success");
      const isFailing = attempts.length === 2 && attempts.every((a) => a.status === "failure");

      return {
        brand,
        label: BRAND_LABELS[brand],
        lastSyncedAt: lastSuccess?.created_at ?? null,
        isFailing,
      };
    }),
  );
}
