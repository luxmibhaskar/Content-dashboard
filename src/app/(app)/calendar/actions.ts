"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { parseResearchCopyPaste } from "@/lib/paste-import";
import { upsertVersionAndAutoActivate } from "@/lib/content-versions";
import { autoPopulateCompetitorBenchmarks } from "@/lib/competitor-auto-populate";
import type { ResearchCopyResult } from "@/lib/types";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

// docs/topic-page-redesign.md Section 1: the "+ New (AI Research)" form
// is condensed to Title, Brief Description, Keywords only, everything
// else fills in from the topic page itself. final_title mirrors the
// title too (not left blank), same reasoning as the Idea Panel's
// ensureMigrated: an empty "Untitled" header on a row that's already
// real underneath reads as broken, not as "not polished yet."
export async function createContentItem(formData: FormData) {
  const title = str(formData, "title");
  if (!title) {
    throw new Error("Title is required.");
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      brand,
      final_title: title,
      raw_idea_title: title,
      brief_intent: str(formData, "brief_description"),
      raw_keywords_topics: str(formData, "keywords"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content item.");
  }

  redirect(`/calendar/${data.id}`);
}

export type CreateFromPasteState = { error: string | null; fallbackRaw: string | null };

// "+ New (Manual)": paste-first, no Title/Brief Description/Keywords
// form at all (docs/topic-page-redesign.md Section 1), replaces the
// earlier "collect three fields, then land on the topic page with
// Paste expanded" flow rather than sitting alongside it. Free,
// pattern-based parsing (src/lib/paste-import.ts), no Claude API call.
//
// The item genuinely doesn't exist until a confident parse succeeds,
// there's nothing to create on a failed one, the raw text just comes
// back editable, same fallback UX as the topic page's own "Paste from
// AI chat" (src/components/paste-import-section.tsx): don't guess at a
// partial/wrong structure, let the creator fix formatting and retry.
//
// Title comes from the parsed research's own first title option
// (parseResearchCopyPaste guarantees at least one whenever it returns
// non-null), not asked for separately, still editable on the topic page
// afterward like everything else there. Same downstream effects a real
// Run gets once landed: writes the Manual source, auto-activates (this
// is always the item's first version, see upsertVersionAndAutoActivate),
// runs Competitor auto-population.
export async function createContentItemFromPaste(
  _prevState: CreateFromPasteState,
  formData: FormData,
): Promise<CreateFromPasteState> {
  const pastedText = String(formData.get("pasted_text") ?? "");
  const parsed = parseResearchCopyPaste(pastedText);
  if (!parsed) {
    return { error: null, fallbackRaw: pastedText };
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const title = parsed.titles[0];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({ brand, final_title: title, raw_idea_title: title })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Failed to create content item.", fallbackRaw: pastedText };
  }

  const researchCopy: ResearchCopyResult = { ...parsed, generatedAt: new Date().toISOString() };
  await upsertVersionAndAutoActivate(supabase, "research_copy_versions", data.id, brand, "manual", researchCopy);
  await autoPopulateCompetitorBenchmarks(supabase, { contentId: data.id, brand, researchCopy }).catch(() => {});

  redirect(`/calendar/${data.id}`);
}
