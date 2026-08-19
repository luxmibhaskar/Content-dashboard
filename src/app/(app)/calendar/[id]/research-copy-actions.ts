"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeResearchAndCopy } from "@/lib/anthropic";

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
export async function runResearchAndCopy(
  contentId: string,
  _prevState: RunResearchState,
  _formData: FormData,
): Promise<RunResearchState> {
  const supabase = await createClient();

  try {
    const { data: item, error: itemError } = await supabase
      .from("content_calendar")
      .select("final_title, raw_idea_title, brief_intent, raw_keywords_topics")
      .eq("id", contentId)
      .single();
    if (itemError || !item) {
      throw new Error(itemError?.message ?? "Content item not found.");
    }

    const title = item.final_title || item.raw_idea_title;
    if (!title) {
      throw new Error("Add a title before running research, there's nothing to search for yet.");
    }

    const researchCopy = await synthesizeResearchAndCopy({
      title,
      briefIntent: item.brief_intent,
      keywords: item.raw_keywords_topics,
    });

    const { error } = await supabase
      .from("content_calendar")
      .update({ research_copy: researchCopy })
      .eq("id", contentId);
    if (error) throw new Error(error.message);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong, try again?" };
  }

  revalidatePath(`/calendar/${contentId}`);
  return { error: null };
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
