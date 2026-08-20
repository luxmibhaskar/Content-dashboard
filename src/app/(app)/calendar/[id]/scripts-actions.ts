"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeScripts } from "@/lib/anthropic";
import { parseScriptsPaste } from "@/lib/paste-import";
import type { ScriptsResult } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RunScriptsState = { error: string | null };

// Shared by both the real AI-calling Run (below) and the free
// "Paste from AI chat" import (importScriptsPaste, further down): the
// write plus the page revalidation, so paste-import can never silently
// skip either. No other side effects are currently tied to scripts
// landing (unlike research_copy's Competitor auto-population).
async function saveScriptsResult(supabase: SupabaseServerClient, contentId: string, scripts: ScriptsResult) {
  const { error } = await supabase.from("content_calendar").update({ scripts }).eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/calendar/${contentId}`);
}

// docs/topic-page-redesign.md Section 2, Tab 2 "Scripts": its own
// separate Run, distinct from Tab 1's, only generates when this tab is
// opened and tapped. Regenerates scripts wholesale each time, same
// no-history convention as research_copy. Needs research_copy to already
// exist, the script's main points are meant to specifically address the
// pain points and questions Tab 1 surfaced, not the topic in the
// abstract.
export async function runScripts(
  contentId: string,
  _prevState: RunScriptsState,
  _formData: FormData,
): Promise<RunScriptsState> {
  const supabase = await createClient();

  try {
    const { data: item, error: itemError } = await supabase
      .from("content_calendar")
      .select("final_title, raw_idea_title, brief_intent, raw_keywords_topics, research_copy")
      .eq("id", contentId)
      .single();
    if (itemError || !item) {
      throw new Error(itemError?.message ?? "Content item not found.");
    }

    const title = item.final_title || item.raw_idea_title;
    if (!title) {
      throw new Error("Add a title before running scripts, there's nothing to write from yet.");
    }
    if (!item.research_copy) {
      throw new Error("Run Research & Copy first, Scripts draws its main points from that research.");
    }

    const scripts = await synthesizeScripts({
      title,
      briefIntent: item.brief_intent,
      keywords: item.raw_keywords_topics,
      researchCopy: item.research_copy,
    });

    await saveScriptsResult(supabase, contentId, scripts);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong, try again?" };
  }

  return { error: null };
}

export type ImportScriptsState = { fallbackRaw: string | null };

// "Paste from AI chat", docs/topic-page-redesign.md Section 7: free,
// pattern-based parsing (src/lib/paste-import.ts), no Claude API call.
// Same shared save path as a real Run on a confident parse; on a
// low-confidence parse, returns the raw pasted text unchanged so the
// tab can show it back in an editable area instead of guessing.
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
  const scripts: ScriptsResult = { ...parsed, generatedAt: new Date().toISOString() };
  await saveScriptsResult(supabase, contentId, scripts);
  return { fallbackRaw: null };
}
