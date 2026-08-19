"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synthesizeScripts } from "@/lib/anthropic";

export type RunScriptsState = { error: string | null };

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
      .select("final_title, raw_idea_title, brief_intent, raw_keywords_topics, format, research_copy")
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
      format: item.format,
      briefIntent: item.brief_intent,
      keywords: item.raw_keywords_topics,
      researchCopy: item.research_copy,
    });

    const { error } = await supabase
      .from("content_calendar")
      .update({ scripts })
      .eq("id", contentId);
    if (error) throw new Error(error.message);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong, try again?" };
  }

  revalidatePath(`/calendar/${contentId}`);
  return { error: null };
}
