"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeScripts } from "@/lib/anthropic";
import { parseScriptsPaste } from "@/lib/paste-import";
import { setActiveVersion, upsertVersionAndAutoActivate } from "@/lib/content-versions";
import type { ScriptsResult, VersionSource } from "@/lib/types";

export type RunScriptsState = { error: string | null };

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts": its own
// separate Run, distinct from Tab 1's, only generates when this tab is
// opened and tapped.
//
// Manual (pasted) and AI (Run) versions coexist per item now
// (supabase/migrations/0015_research_copy_scripts_versions.sql, Section
// 7), independent of Research & Copy's own Manual/AI split (an item can
// have Manual active for research and AI active for scripts). Run
// always reads whichever research_copy_versions row is currently
// active, "active" means what it says, not always the AI one, so the
// script it writes reflects whatever the creator has actually chosen
// as the research to work from.
export async function runScripts(
  contentId: string,
  _prevState: RunScriptsState,
  _formData: FormData,
): Promise<RunScriptsState> {
  const supabase = await createClient();

  try {
    const { data: item, error: itemError } = await supabase
      .from("content_calendar")
      .select("brand, final_title, raw_idea_title, brief_intent, raw_keywords_topics")
      .eq("id", contentId)
      .single();
    if (itemError || !item) {
      throw new Error(itemError?.message ?? "Content item not found.");
    }

    const title = item.final_title || item.raw_idea_title;
    if (!title) {
      throw new Error("Add a title before running scripts, there's nothing to write from yet.");
    }

    const { data: activeResearch } = await supabase
      .from("research_copy_versions")
      .select("data")
      .eq("content_id", contentId)
      .eq("is_live", true)
      .maybeSingle();
    if (!activeResearch) {
      throw new Error("Run Research & Copy first, Scripts draws its main points from that research.");
    }

    const scripts = await synthesizeScripts({
      title,
      briefIntent: item.brief_intent,
      keywords: item.raw_keywords_topics,
      researchCopy: activeResearch.data,
    });

    await upsertVersionAndAutoActivate(supabase, "scripts_versions", contentId, item.brand, "ai", scripts);
    revalidatePath(`/calendar/${contentId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong, try again?" };
  }

  return { error: null };
}

export type ImportScriptsState = { fallbackRaw: string | null };

// "Paste from AI chat", docs/topic-page-redesign.md Section 7: free,
// pattern-based parsing (src/lib/paste-import.ts), no Claude API call.
// Always writes the Manual source specifically, same as Research &
// Copy's own paste-import, Run and Paste never touch each other's row.
export async function importScriptsPaste(
  contentId: string,
  _prevState: ImportScriptsState,
  formData: FormData,
): Promise<ImportScriptsState> {
  const pastedText = String(formData.get("pasted_text") ?? "");
  const parsed = parseScriptsPaste(pastedText);
  if (!parsed) {
    return { fallbackRaw: pastedText };
  }

  const supabase = await createClient();
  const { data: item, error: itemError } = await supabase
    .from("content_calendar")
    .select("brand")
    .eq("id", contentId)
    .single();
  if (itemError || !item) {
    return { fallbackRaw: pastedText };
  }

  const scripts: ScriptsResult = { ...parsed, generatedAt: new Date().toISOString() };
  await upsertVersionAndAutoActivate(supabase, "scripts_versions", contentId, item.brand, "manual", scripts);
  revalidatePath(`/calendar/${contentId}`);
  return { fallbackRaw: null };
}

// Same is_live concept as title_variants/hook_variants/thumbnail_variants
// and research_copy_versions above, independent active flag from it.
// Unlike research_copy_versions' active flag (which is a real
// technical input to Scripts' own Run), nothing currently reads
// scripts_versions.is_live programmatically, Scripts has no further
// downstream consumer today. It's still built now (this project's
// "build full schemas upfront" convention) so the two tabs stay
// symmetric and the UI can highlight which version the creator
// currently considers primary, not left to guess from two identical-
// looking containers.
export async function setActiveScriptsVersion(contentId: string, source: VersionSource) {
  const supabase = await createClient();
  await setActiveVersion(supabase, "scripts_versions", contentId, source);
  revalidatePath(`/calendar/${contentId}`);
}
