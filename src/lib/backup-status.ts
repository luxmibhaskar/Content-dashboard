import { createClient } from "@/lib/supabase/server";
import { BRANDS, BRAND_LABELS, type Brand } from "@/lib/brand";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BrandBackupStatus = {
  brand: Brand;
  label: string;
  lastSyncedAt: string | null;
  isFailing: boolean;
  failingLayers: string[];
};

async function layerStatus(supabase: SupabaseClient, brand: Brand, layer: "sheets" | "drive") {
  const { data } = await supabase
    .from("backup_log")
    .select("status, created_at")
    .eq("brand", brand)
    .eq("layer", layer)
    .order("created_at", { ascending: false })
    .limit(2);

  const attempts = data ?? [];
  const lastSuccess = attempts.find((a) => a.status === "success");
  const isFailing = attempts.length === 2 && attempts.every((a) => a.status === "failure");

  return { lastSyncedAt: (lastSuccess?.created_at as string | undefined) ?? null, isFailing };
}

// Section 17: "if it fails twice, surface a small visible warning."
// Applies independently to both backup layers, a quietly-broken Drive
// archive shouldn't hide behind a healthy Sheets sync.
export async function getBackupStatuses(): Promise<BrandBackupStatus[]> {
  const supabase = await createClient();

  return Promise.all(
    BRANDS.map(async (brand) => {
      const [sheets, drive] = await Promise.all([
        layerStatus(supabase, brand, "sheets"),
        layerStatus(supabase, brand, "drive"),
      ]);

      const failingLayers = [sheets.isFailing ? "Sheets" : null, drive.isFailing ? "Drive" : null].filter(
        (l): l is string => Boolean(l),
      );

      const lastSyncedAt =
        [sheets.lastSyncedAt, drive.lastSyncedAt]
          .filter((d): d is string => Boolean(d))
          .sort()
          .pop() ?? null;

      return {
        brand,
        label: BRAND_LABELS[brand],
        lastSyncedAt,
        isFailing: failingLayers.length > 0,
        failingLayers,
      };
    }),
  );
}
