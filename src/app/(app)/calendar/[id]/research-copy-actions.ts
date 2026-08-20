"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeResearchAndCopy } from "@/lib/anthropic";
import { autoPopulateCompetitorBenchmarks } from "@/lib/competitor-auto-populate";
import { parseResearchCopyPaste } from "@/lib/paste-import";
import { setActiveVersion, upsertVersionAndAutoActivate } from "@/lib/content-versions";
import type { ResearchCopyResult, ResearchProgress, ResearchStep, StepStatus, VersionSource } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RunResearchState = { error: string | null };

// Shared by runResearchAndCopy (fresh) and deepenResearchFromManual
// (below): the research_progress step tracking, identical shape either
// way, only what generates the actual ResearchCopyResult differs.
function createProgressTracker(supabase: SupabaseServerClient, contentId: string) {
  const steps: Record<ResearchStep, StepStatus> = {
    summary: "pending",
    sources: "pending",
    copy: "pending",
  };
  const writeProgress = async (status: ResearchProgress["status"], error: string | null = null) => {
    const progress: ResearchProgress = { status, steps: { ...steps }, error, updatedAt: new Date().toISOString() };
    await supabase.from("content_calendar").update({ research_progress: progress }).eq("id", contentId);
  };
  return { steps, writeProgress };
}

// docs/topic-page-redesign.md Section 2, Tab 1 "Research & Copy": one
// Run, full depth from the start, replaces the old shallow Run Research
// step entirely.
//
// Manual (pasted) and AI (Run) versions coexist per item now
// (supabase/migrations/0015_research_copy_scripts_versions.sql, Section
// 7), each regenerated wholesale on its own source's next Run/Paste, no
// shared history between them. Competitor auto-population (Section 5,
// no API cost) runs for every save regardless of source, scanning that
// version's own text, so a competitor mentioned only in the Manual
// version isn't missed until someone happens to make it active.
//
// useActionState-shaped (prevState, formData) rather than throwing:
// this call can legitimately take minutes, and a thrown error here had
// no path to a friendly in-page message, just Next's generic error
// boundary. Returning { error } instead lets the Run button's own
// pending state and an inline message both come from the same hook,
// and lets the client-timeout message (or a real API error) surface
// exactly where the button is instead of crashing the page.
//
// research_progress is written between each of synthesizeResearchAndCopy's
// 3 internal calls, purely so getResearchProgress (below) can be polled by
// a separate, concurrent request while this action is still in flight,
// no background-job machinery needed, this stays one blocking request.
// It tracks the AI Run's own step-by-step status specifically, Paste
// has no steps to track and never touches it.
export async function runResearchAndCopy(
  contentId: string,
  _prevState: RunResearchState,
  _formData: FormData,
): Promise<RunResearchState> {
  const supabase = await createClient();
  const { steps, writeProgress } = createProgressTracker(supabase, contentId);

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
      throw new Error("Add a title before running research, there's nothing to search for yet.");
    }

    await writeProgress("running");

    const researchCopy = await synthesizeResearchAndCopy({
      title,
      briefIntent: item.brief_intent,
      keywords: item.raw_keywords_topics,
      onStep: async (step, status) => {
        steps[step] = status;
        await writeProgress("running");
      },
    });

    await upsertVersionAndAutoActivate(supabase, "research_copy_versions", contentId, item.brand, "ai", researchCopy);
    await autoPopulateCompetitorBenchmarks(supabase, { contentId, brand: item.brand, researchCopy }).catch(() => {});
    await writeProgress("done");
    revalidatePath(`/calendar/${contentId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong, try again?";
    await writeProgress("error", message).catch(() => {});
    return { error: message };
  }

  return { error: null };
}

// "Go deeper" from the Manual panel (docs/topic-page-redesign.md
// Section 7): functionally distinct from runResearchAndCopy above, this
// doesn't start a fresh independent pass, it hands the currently-pasted
// Manual research to synthesizeResearchAndCopy's deepenFrom param so the
// model searches for what that existing material doesn't already cover
// and builds on it. The result is a real new AI research pass either
// way (a real API call, real cost), so it writes to the AI source, same
// as a normal Run, Manual's own row is never touched, staying available
// to deepen from again later. Same research_progress tracking, same
// Competitor auto-population, same everything downstream, only call 1's
// prompt differs (see synthesizeResearchAndCopy).
export async function deepenResearchFromManual(
  contentId: string,
  _prevState: RunResearchState,
  _formData: FormData,
): Promise<RunResearchState> {
  const supabase = await createClient();
  const { steps, writeProgress } = createProgressTracker(supabase, contentId);

  try {
    const [{ data: item, error: itemError }, { data: manualVersion, error: manualError }] = await Promise.all([
      supabase
        .from("content_calendar")
        .select("brand, final_title, raw_idea_title, brief_intent, raw_keywords_topics")
        .eq("id", contentId)
        .single(),
      supabase
        .from("research_copy_versions")
        .select("data")
        .eq("content_id", contentId)
        .eq("source", "manual")
        .maybeSingle(),
    ]);
    if (itemError || !item) {
      throw new Error(itemError?.message ?? "Content item not found.");
    }
    if (manualError || !manualVersion) {
      throw new Error("Nothing pasted in Manual to deepen from yet.");
    }

    const title = item.final_title || item.raw_idea_title;
    if (!title) {
      throw new Error("Add a title before running research, there's nothing to search for yet.");
    }

    await writeProgress("running");

    const researchCopy = await synthesizeResearchAndCopy({
      title,
      briefIntent: item.brief_intent,
      keywords: item.raw_keywords_topics,
      deepenFrom: manualVersion.data as ResearchCopyResult,
      onStep: async (step, status) => {
        steps[step] = status;
        await writeProgress("running");
      },
    });

    await upsertVersionAndAutoActivate(supabase, "research_copy_versions", contentId, item.brand, "ai", researchCopy);
    await autoPopulateCompetitorBenchmarks(supabase, { contentId, brand: item.brand, researchCopy }).catch(() => {});
    await writeProgress("done");
    revalidatePath(`/calendar/${contentId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong, try again?";
    await writeProgress("error", message).catch(() => {});
    return { error: message };
  }

  return { error: null };
}

export type ImportResearchCopyState = { fallbackRaw: string | null };

// "Paste from AI chat", docs/topic-page-redesign.md Section 7: free,
// pattern-based parsing (src/lib/paste-import.ts), no Claude API call.
// Parsing happens here, not just client-side, so the save path below
// only ever runs against something this server actually validated. On
// a confident parse, always writes the Manual source specifically
// (never the AI one, Run and Paste never touch each other's row), and
// runs the same Competitor auto-population a real Run does. On a
// low-confidence parse, returns the raw pasted text unchanged rather
// than guessing, the tab shows it back in an editable area instead of
// auto-filling anything.
export async function importResearchCopyPaste(
  contentId: string,
  _prevState: ImportResearchCopyState,
  formData: FormData,
): Promise<ImportResearchCopyState> {
  const pastedText = String(formData.get("pasted_text") ?? "");
  const parsed = parseResearchCopyPaste(pastedText);
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

  const researchCopy: ResearchCopyResult = { ...parsed, generatedAt: new Date().toISOString() };
  await upsertVersionAndAutoActivate(supabase, "research_copy_versions", contentId, item.brand, "manual", researchCopy);
  await autoPopulateCompetitorBenchmarks(supabase, { contentId, brand: item.brand, researchCopy }).catch(() => {});
  revalidatePath(`/calendar/${contentId}`);
  return { fallbackRaw: null };
}

// Radio-exclusive "which version feeds downstream consumers" (Scripts'
// Run input, specifically, Section 7), same is_live concept as
// title_variants/hook_variants/thumbnail_variants. A deliberate creator
// choice, never a side effect of Run or Paste themselves (see
// upsertVersionAndAutoActivate: it only auto-activates a brand-new
// item's first version, of either source).
export async function setActiveResearchCopyVersion(contentId: string, source: VersionSource) {
  const supabase = await createClient();
  await setActiveVersion(supabase, "research_copy_versions", contentId, source);
  revalidatePath(`/calendar/${contentId}`);
}

// Plain read for the poll loop in ResearchAndCopyTab, called imperatively
// (not via a <form>) from a client useEffect while Run is pending.
export async function getResearchProgress(contentId: string): Promise<ResearchProgress | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("content_calendar")
    .select("research_progress")
    .eq("id", contentId)
    .single();
  return (data?.research_progress as ResearchProgress | null) ?? null;
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

// "Use This" actions, non-destructive by convention (matches the old
// Research Output pattern): each writes one Copy-Ready field, never
// auto-applied, the creator picks.
// Tab 1's own small input fields (Creator Input's full field set is
// gone, but Run still needs a brief description and keywords to search
// against, and those should stay editable in place so a re-run can be
// refined without leaving the tab).
export async function updateResearchInput(contentId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({
      brief_intent: str(formData, "brief_intent"),
      raw_keywords_topics: str(formData, "raw_keywords_topics"),
    })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/calendar/${contentId}`);
}

export async function useResearchTitle(contentId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ final_title: str(formData, "value") })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/calendar/${contentId}`);
}

export async function useResearchDescription(contentId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ final_description: str(formData, "value") })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/calendar/${contentId}`);
}

export async function useResearchKeywordTags(contentId: string, tags: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ plain_keyword_tags: tags })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/calendar/${contentId}`);
}

export async function useResearchQuestionTags(contentId: string, tags: string[]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ question_style_tags: tags })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/calendar/${contentId}`);
}
