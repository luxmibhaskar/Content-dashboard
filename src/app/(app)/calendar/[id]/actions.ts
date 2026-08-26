"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAll(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String);
}

export async function updateContentItem(id: string, brand: string, formData: FormData) {
  const supabase = await createClient();

  const publishDateRaw = String(formData.get("publish_date") ?? "");
  const platforms = getAll(formData, "platform");

  // Audit finding, fixed here (found while wiring Phase C of
  // docs/platform-performance-tracking.md, not otherwise related to it):
  // this update used to unconditionally write raw_idea_title,
  // raw_keywords_topics, brief_intent, content_angle_hook_direction,
  // reference_inspiration, target_stage_viewer_journey,
  // my_angle_unique_pov, proof_credibility, tone_style, idea_source,
  // source_detail, viewer_problem, promise_outcome, final_title_hook,
  // viewer_keywords_search_phrases, viewer_description,
  // primary_emotion_pain_point, objections_doubts, desired_action_cta,
  // completeness_checklist, format_recommendation, main_pointers,
  // energy_tag, full_script, voice_memo_transcript, and
  // platform_publishing on every Save, none of which this form has had
  // an input for since the topic page's three-tab rebuild
  // (docs/topic-page-redesign.md Section 2) and, for brief_intent/
  // raw_keywords_topics specifically, since those moved to their own
  // updateResearchInput action (research-copy-actions.ts). formData.get
  // on an absent field returns null, so every one of those columns was
  // silently getting nulled on every unrelated Save, confirmed live
  // against real data (a content item with a genuinely populated
  // main_pointers array, still intact only because it happened not to
  // have been saved since). Same fix already applied once before for a
  // different field group (Section 9 of that doc): stop passing keys
  // this form has no input for, don't pass them as null.
  const { error } = await supabase
    .from("content_calendar")
    .update({
      // Header
      final_title: str(formData, "final_title"),
      production_status: str(formData, "production_status"),
      viability_status: String(formData.get("viability_status")),
      viability_reason_note: str(formData, "viability_reason_note"),

      // 10.1.6 System & Production (core fields only, this chunk)
      pillar: str(formData, "pillar"),
      sub_topic: str(formData, "sub_topic"),
      format: str(formData, "format"),
      // Only present in formData while Format is Short or Long Video
      // (format-platform-fields.tsx), otherwise correctly clears to [].
      platform: platforms,
      publish_date: publishDateRaw ? new Date(publishDateRaw).toISOString() : null,

      // docs/platform-performance-tracking.md Section 3: Short Form
      // title container's short description. Only present in formData
      // while Format is Short, otherwise correctly clears to null, same
      // "field's only meaning is short-form" reasoning as platform used
      // to have before platform itself grew to cover Long Form too.
      final_description: str(formData, "final_description"),
      // docs/platform-performance-tracking.md Section 6: the derived-
      // from picker (DerivedFromPicker, format-platform-fields.tsx),
      // Short-only for the same reason, a Long Form item doesn't derive
      // from anything.
      derived_from_content_id: str(formData, "derived_from_content_id"),

      // Performance metrics (Section 6.2 KPIs). Left blank = untracked
      // (null), not 0, so Analytics can tell the two apart. Relocated
      // out of the removed System & Production section, still submitted
      // by this same form (src/app/(app)/calendar/[id]/page.tsx), the
      // one field that section held which fed something outside itself.
      views: num(formData, "views"),
      likes: num(formData, "likes"),
      comments: num(formData, "comments"),
      shares: num(formData, "shares"),
      saves: num(formData, "saves"),
      conversions: num(formData, "conversions"),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  // docs/platform-performance-tracking.md Section 3: each platform
  // actually posted to gets its own content_platform_posts row. Upsert
  // with ignoreDuplicates so an already-tracked platform's published_at
  // (set once, when it was first added) and retention_drop_note are
  // never touched by a later, unrelated Save; removing a platform from
  // the picker deliberately does not delete its row here either, once
  // posted it stays a real historical record even if the multiselect
  // toggle is later turned back off.
  if (platforms.length > 0) {
    const { error: postsError } = await supabase.from("content_platform_posts").upsert(
      platforms.map((platform) => ({ content_id: id, brand, platform })),
      { onConflict: "content_id,platform", ignoreDuplicates: true },
    );
    if (postsError) {
      throw new Error(postsError.message);
    }
  }

  revalidatePath("/calendar");
  // A plain revalidatePath() on this same route was not reliably enough to
  // avoid the client router briefly showing pre-save data right after
  // submit (fields appeared to "revert" until a manual refresh, even
  // though the write itself had already landed). redirect() forces a
  // genuine fresh navigation instead of a soft revalidation.
  redirect(`/calendar/${id}`);
}
