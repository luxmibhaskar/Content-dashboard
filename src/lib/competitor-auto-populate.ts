import type { createClient } from "@/lib/supabase/server";
import type { ResearchCopyResult } from "@/lib/types";

// docs/topic-page-redesign.md Section 5: "Whenever research... surfaces
// competitor information, it should automatically populate into the
// existing Competitors section." Deliberately no AI call here, this
// matches research_copy's own text against the brand's already-known
// competitors (the ones already entered on the Competitors page) rather
// than trying to detect a "competitor" out of arbitrary research prose,
// which would need real judgment a plain string match can't provide.
// Runs on data already sitting in Supabase from the research pass that
// just completed, no new API spend either way.
export async function autoPopulateCompetitorBenchmarks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { contentId: string; brand: string; researchCopy: ResearchCopyResult },
): Promise<void> {
  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name")
    .eq("brand", params.brand)
    .eq("active", true);

  if (!competitors || competitors.length === 0) return;

  const haystack = [
    params.researchCopy.summary,
    params.researchCopy.description,
    ...params.researchCopy.containers.map((c) => c.sourceName),
    ...params.researchCopy.containers.flatMap((c) => c.items ?? []),
  ]
    .join("\n")
    .toLowerCase();

  for (const competitor of competitors) {
    const name = competitor.name.trim();
    // Short names (e.g. a 2-letter abbreviation) match too much
    // unrelated text to be a trustworthy signal on their own.
    if (name.length < 3 || !haystack.includes(name.toLowerCase())) continue;

    const { data: existing } = await supabase
      .from("competitor_benchmarks")
      .select("id")
      .eq("content_id", params.contentId)
      .eq("competitor_id", competitor.id)
      .maybeSingle();
    if (existing) continue;

    const matchingContainer = params.researchCopy.containers.find((c) =>
      c.sourceName.toLowerCase().includes(name.toLowerCase()),
    );
    const matchingSource = params.researchCopy.globalSources.find((s) =>
      s.title.toLowerCase().includes(name.toLowerCase()),
    );
    const url = matchingContainer?.sources[0]?.url ?? matchingSource?.url ?? null;

    await supabase.from("competitor_benchmarks").insert({
      brand: params.brand,
      content_id: params.contentId,
      competitor_id: competitor.id,
      competitor_name: competitor.name,
      url,
      why_benchmark: "Auto-populated: surfaced in this topic's Research & Copy pass.",
    });
  }
}
