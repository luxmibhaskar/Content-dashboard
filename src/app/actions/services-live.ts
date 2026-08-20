"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseLiveStatus, getSerpApiLiveStatus, getDriveLiveStatus, type LiveStatus } from "@/lib/services-live";
import { searchGeneral } from "@/lib/serpapi";
import { synthesizeServiceAlternatives } from "@/lib/anthropic";

// Section 5.3: fetched only when the Live Status disclosure is actually
// opened, not on every Dashboard load, "one tap away" rather than
// constant monitoring.
export async function getLiveServiceStatuses(): Promise<Record<string, LiveStatus>> {
  const supabase = await createClient();
  const [supabaseStatus, serpapiStatus, driveStatus] = await Promise.all([
    getSupabaseLiveStatus(supabase),
    getSerpApiLiveStatus(),
    getDriveLiveStatus(),
  ]);
  return { supabase: supabaseStatus, serpapi: serpapiStatus, "google-sheets-drive": driveStatus };
}

// Section 5.3: pure information, never switches anything automatically.
// Always inserts a new row (research_snapshots-style append-only), the
// panel reads back only the latest per service.
export async function checkAlternatives(serviceName: string, currentTier: string) {
  const searchResults = await searchGeneral(`${serviceName} alternatives 2026 pricing`);
  const { findingsSummary, verdict } = await synthesizeServiceAlternatives(
    serviceName,
    currentTier,
    searchResults,
  );

  const supabase = await createClient();
  const { error } = await supabase.from("service_alternative_checks").insert({
    service_name: serviceName,
    findings_summary: findingsSummary,
    verdict,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
