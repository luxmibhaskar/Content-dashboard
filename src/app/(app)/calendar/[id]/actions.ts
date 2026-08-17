"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

function lines(formData: FormData, key: string): string[] {
  return String(formData.get(key) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function json(formData: FormData, key: string, fallback: unknown) {
  const raw = String(formData.get(key) ?? "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateContentItem(id: string, formData: FormData) {
  const supabase = await createClient();

  const publishDateRaw = String(formData.get("publish_date") ?? "");

  const { error } = await supabase
    .from("content_calendar")
    .update({
      // Header
      final_title: str(formData, "final_title"),
      production_status: String(formData.get("production_status")),
      viability_status: String(formData.get("viability_status")),
      viability_reason_note: str(formData, "viability_reason_note"),

      // 10.1.6 System & Production (core fields only, this chunk)
      pillar: str(formData, "pillar"),
      sub_topic: str(formData, "sub_topic"),
      format: str(formData, "format"),
      publish_date: publishDateRaw ? new Date(publishDateRaw).toISOString() : null,

      // 10.1.1 Creator Input
      raw_idea_title: str(formData, "raw_idea_title"),
      raw_keywords_topics: str(formData, "raw_keywords_topics"),
      brief_intent: str(formData, "brief_intent"),
      content_angle_hook_direction: str(formData, "content_angle_hook_direction"),
      reference_inspiration: str(formData, "reference_inspiration"),
      target_stage_viewer_journey: str(formData, "target_stage_viewer_journey"),
      my_angle_unique_pov: str(formData, "my_angle_unique_pov"),
      proof_credibility: str(formData, "proof_credibility"),
      tone_style: str(formData, "tone_style"),
      idea_source: str(formData, "idea_source"),
      source_detail: str(formData, "source_detail"),

      // 10.1.2 Viewer POV
      viewer_problem: str(formData, "viewer_problem"),
      promise_outcome: str(formData, "promise_outcome"),
      final_title_hook: str(formData, "final_title_hook"),
      viewer_keywords_search_phrases: str(formData, "viewer_keywords_search_phrases"),
      viewer_description: str(formData, "viewer_description"),
      primary_emotion_pain_point: str(formData, "primary_emotion_pain_point"),
      objections_doubts: lines(formData, "objections_doubts"),
      desired_action_cta: str(formData, "desired_action_cta"),
      completeness_checklist: json(formData, "completeness_checklist", []),
      format_recommendation: str(formData, "format_recommendation"),

      // 10.1.5 Recording Section
      main_pointers: json(formData, "main_pointers", []),
      energy_tag: str(formData, "energy_tag"),
      full_script: str(formData, "full_script"),
      voice_memo_transcript: str(formData, "voice_memo_transcript"),

      // 10.1.4 Publishing Ready
      platform_publishing: json(formData, "platform_publishing", {}),

      // 10.1.6 System & Production (remainder)
      sequence_step: str(formData, "sequence_step"),
      sequence_order_custom: num(formData, "sequence_order_custom"),
      evidence_condition: str(formData, "evidence_condition"),
      script_outline_link: str(formData, "script_outline_link"),
      published_url: str(formData, "published_url"),
      performance_notes: str(formData, "performance_notes"),
      series_playlist: str(formData, "series_playlist"),
      search_demand_trend_signal: str(formData, "search_demand_trend_signal"),
      success_metric_focus: str(formData, "success_metric_focus"),
      follow_up_content_ideas: lines(formData, "follow_up_content_ideas"),
      analytics_review_date: str(formData, "analytics_review_date"),
      retention_drop_timestamp: str(formData, "retention_drop_timestamp"),
      retention_drop_note: str(formData, "retention_drop_note"),
      earned_the_click: str(formData, "earned_the_click"),
      earned_click_note: str(formData, "earned_click_note"),
      derived_from_content_id:
        str(formData, "derived_from_content_id") === id
          ? null
          : str(formData, "derived_from_content_id"),

      // Performance metrics (Section 6.2 KPIs). Left blank = untracked
      // (null), not 0, so Analytics can tell the two apart.
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

  revalidatePath("/calendar");
  // A plain revalidatePath() on this same route was not reliably enough to
  // avoid the client router briefly showing pre-save data right after
  // submit (fields appeared to "revert" until a manual refresh, even
  // though the write itself had already landed). redirect() forces a
  // genuine fresh navigation instead of a soft revalidation.
  redirect(`/calendar/${id}`);
}
