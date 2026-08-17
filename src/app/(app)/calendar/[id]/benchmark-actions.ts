"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

async function exec(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) {
    throw new Error(error.message);
  }
}

// Section 10.1.6: add directly here with a free-text competitor name, or
// pick from the competitors table if one's already tracked there.
export async function addCompetitorBenchmark(contentId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: content, error: contentError } = await supabase
    .from("content_calendar")
    .select("brand")
    .eq("id", contentId)
    .single();
  if (contentError || !content) {
    throw new Error(contentError?.message ?? "Content item not found.");
  }

  const competitorId = str(formData, "competitor_id");
  let competitorName = str(formData, "competitor_name");

  if (competitorId) {
    const { data: competitor, error: competitorError } = await supabase
      .from("competitors")
      .select("name")
      .eq("id", competitorId)
      .single();
    if (competitorError || !competitor) {
      throw new Error(competitorError?.message ?? "Competitor not found.");
    }
    competitorName = competitor.name;
  }

  if (!competitorName) {
    redirect(`/calendar/${contentId}`);
  }

  await exec(
    supabase.from("competitor_benchmarks").insert({
      content_id: contentId,
      brand: content.brand,
      competitor_id: competitorId,
      competitor_name: competitorName,
      platform: str(formData, "platform"),
      url: str(formData, "url"),
      why_benchmark: str(formData, "why_benchmark"),
      notes: str(formData, "notes"),
    }),
  );

  redirect(`/calendar/${contentId}`);
}

export async function deleteCompetitorBenchmark(contentId: string, benchmarkId: string) {
  const supabase = await createClient();
  await exec(supabase.from("competitor_benchmarks").delete().eq("id", benchmarkId));
  redirect(`/calendar/${contentId}`);
}
