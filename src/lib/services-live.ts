import type { SupabaseClient } from "@supabase/supabase-js";
import { getDriveClient } from "@/lib/google-drive";

export type LiveStatus = { text: string } | { error: string };

const SUPABASE_FREE_TIER_BYTES = 500 * 1024 * 1024;

// Section 5.3: "e.g. Supabase: 340MB / 500MB". No REST endpoint exposes
// this with the keys already in use, but Postgres does directly, see
// get_database_size_bytes() in supabase/migrations/0003_phase3.sql.
export async function getSupabaseLiveStatus(supabase: SupabaseClient): Promise<LiveStatus> {
  try {
    const { data, error } = await supabase.rpc("get_database_size_bytes");
    if (error) throw new Error(error.message);
    const bytes = Number(data);
    const mb = bytes / (1024 * 1024);
    const pct = Math.round((bytes / SUPABASE_FREE_TIER_BYTES) * 100);
    return { text: `${mb.toFixed(0)}MB / 500MB (${pct}%)` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to check Supabase usage." };
  }
}

type SerpApiAccount = {
  plan_searches_left?: number;
  searches_per_month?: number;
  this_month_usage?: number;
};

// Section 5.3: "e.g. SerpApi: 40/250 searches used this month".
export async function getSerpApiLiveStatus(): Promise<LiveStatus> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return { error: "SERPAPI_KEY is not configured." };

  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${apiKey}`);
    if (!res.ok) throw new Error(`SerpApi account check failed (${res.status}).`);
    const data = (await res.json()) as SerpApiAccount;

    if (data.searches_per_month != null && data.this_month_usage != null) {
      return { text: `${data.this_month_usage}/${data.searches_per_month} searches used this month` };
    }
    if (data.plan_searches_left != null) {
      return { text: `${data.plan_searches_left} searches remaining this month` };
    }
    return { error: "Unexpected response shape from SerpApi's account endpoint." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to check SerpApi usage." };
  }
}

// Google Drive's own storage quota, reusing the existing Drive OAuth
// client already set up for the full-content archive (Section 17.2).
export async function getDriveLiveStatus(): Promise<LiveStatus> {
  try {
    const drive = getDriveClient();
    const { data } = await drive.about.get({ fields: "storageQuota" });
    const usage = Number(data.storageQuota?.usage);
    const limit = Number(data.storageQuota?.limit);
    if (!usage || !limit) {
      return { error: "Drive returned no quota data (unlimited-quota accounts don't report a limit)." };
    }
    const usageGb = usage / 1024 ** 3;
    const limitGb = limit / 1024 ** 3;
    const pct = Math.round((usage / limit) * 100);
    return { text: `${usageGb.toFixed(1)}GB / ${limitGb.toFixed(0)}GB (${pct}%)` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to check Drive usage." };
  }
}
