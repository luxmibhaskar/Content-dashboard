"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeResearchAndCopy } from "@/lib/anthropic";
import { autoPopulateCompetitorBenchmarks } from "@/lib/competitor-auto-populate";
import type { ResearchProgress, ResearchStep, StepStatus } from "@/lib/types";

export type RunResearchState = { error: string | null };

// docs/topic-page-redesign.md Section 2, Tab 1 "Research & Copy": one
// Run, full depth from the start, replaces the old shallow Run Research
// step entirely. Regenerates research_copy wholesale each time, no
// history/snapshots.
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
export async function runResearchAndCopy(
  contentId: string,
  _prevState: RunResearchState,
  _formData: FormData,
): Promise<RunResearchState> {
  const supabase = await createClient();

  const steps: Record<ResearchStep, StepStatus> = {
    summary: "pending",
    sources: "pending",
    copy: "pending",
  };
  const writeProgress = async (status: ResearchProgress["status"], error: string | null = null) => {
    const progress: ResearchProgress = { status, steps: { ...steps }, error, updatedAt: new Date().toISOString() };
    await supabase.from("content_calendar").update({ research_progress: progress }).eq("id", contentId);
  };

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

    const { error } = await supabase
      .from("content_calendar")
      .update({ research_copy: researchCopy })
      .eq("id", contentId);
    if (error) throw new Error(error.message);

    // Section 5: no research spend of its own, matches against
    // already-known competitors on data already in hand, never blocks
    // the Run on failure, this is a nice-to-have side effect not the
    // point of Research & Copy.
    await autoPopulateCompetitorBenchmarks(supabase, {
      contentId,
      brand: item.brand,
      researchCopy,
    }).catch(() => {});

    await writeProgress("done");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong, try again?";
    await writeProgress("error", message).catch(() => {});
    return { error: message };
  }

  revalidatePath(`/calendar/${contentId}`);
  return { error: null };
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
