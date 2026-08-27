"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

type IdeaFields = {
  brand: string;
  idea_title: string;
  pillar: string | null;
  sub_topic: string | null;
  format: string | null;
  // Idea Panel format field (2026-08-27): supabase/migrations/0022_ideas_platform.sql,
  // same pattern as content_calendar.platform.
  platform: string[];
  brief_description: string | null;
  reference_url: string | null;
  idea_source: string | null;
  source_detail: string | null;
};

// Section 8.2: moving status to Research (or straight to Ready to work,
// if that's reached without passing through Research first) creates the
// full content_calendar row the first time, research_snapshots has a
// hard FK to content_calendar so a real row has to exist before
// research has anywhere to write results. production_status is left
// null (the schema default) since nothing's ready to record yet, it
// stays null, and the item stays off the Calendar view as a card, until
// Transfer to Calendar assigns its first real status.
async function ensureMigrated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  existingContentId: string | null,
  fields: IdeaFields,
): Promise<string> {
  if (existingContentId) return existingContentId;

  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      brand: fields.brand,
      pillar: fields.pillar,
      sub_topic: fields.sub_topic,
      format: fields.format,
      platform: fields.platform,
      // final_title starts as the idea's title too, not blank, an empty
      // "Untitled" header on a row that's already real underneath reads
      // as broken, not as "not polished yet." Free to edit from here.
      final_title: fields.idea_title,
      raw_idea_title: fields.idea_title,
      brief_intent: fields.brief_description,
      reference_inspiration: fields.reference_url,
      idea_source: fields.idea_source,
      source_detail: fields.source_detail,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content calendar entry.");
  }

  return data.id;
}

export async function updateIdea(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("brand, migrated_to_content_id")
    .eq("id", id)
    .single();

  if (fetchError || !idea) {
    throw new Error(fetchError?.message ?? "Idea not found.");
  }

  const fields: IdeaFields = {
    brand: idea.brand,
    idea_title: str(formData, "idea_title") ?? "",
    pillar: str(formData, "pillar"),
    sub_topic: str(formData, "sub_topic"),
    format: str(formData, "format"),
    // Only present in formData while Format is Short or Long Video
    // (idea-format-platform-fields.tsx), otherwise correctly clears to [].
    platform: formData.getAll("platform").map(String),
    brief_description: str(formData, "brief_description"),
    reference_url: str(formData, "reference_url"),
    idea_source: str(formData, "idea_source"),
    source_detail: str(formData, "source_detail"),
  };

  const status = String(formData.get("status") ?? "Idea");

  const migratedToContentId =
    status !== "Idea" ? await ensureMigrated(supabase, idea.migrated_to_content_id, fields) : idea.migrated_to_content_id;

  const { error } = await supabase
    .from("ideas")
    .update({ ...fields, status, migrated_to_content_id: migratedToContentId })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ideas");
  redirect(`/ideas/${id}`);
}

// Section 19: "Transfer to Calendar" from the Idea Panel/Scout flow.
// Reuses the same auto-created content_calendar row as ensureMigrated
// (via idea.migrated_to_content_id) rather than creating a duplicate if
// one already exists from an earlier status change. This is also the
// action that assigns the item's first real production_status, per the
// null-until-transfer decision: null items stay off the Calendar view
// entirely and only start appearing as cards once this runs. Never
// downgrades an already-set status, idempotent if pressed again.
export async function transferToCalendar(ideaId: string) {
  const supabase = await createClient();

  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select(
      "brand, idea_title, pillar, sub_topic, format, platform, brief_description, reference_url, idea_source, source_detail, migrated_to_content_id",
    )
    .eq("id", ideaId)
    .single();

  if (fetchError || !idea) {
    throw new Error(fetchError?.message ?? "Idea not found.");
  }

  const fields: IdeaFields = {
    brand: idea.brand,
    idea_title: idea.idea_title,
    pillar: idea.pillar,
    sub_topic: idea.sub_topic,
    format: idea.format,
    platform: idea.platform ?? [],
    brief_description: idea.brief_description,
    reference_url: idea.reference_url,
    idea_source: idea.idea_source,
    source_detail: idea.source_detail,
  };

  const contentId = await ensureMigrated(supabase, idea.migrated_to_content_id, fields);

  const { data: contentItem, error: contentFetchError } = await supabase
    .from("content_calendar")
    .select("production_status")
    .eq("id", contentId)
    .single();
  if (contentFetchError || !contentItem) {
    throw new Error(contentFetchError?.message ?? "Content calendar entry not found.");
  }

  if (!contentItem.production_status) {
    const { error: statusError } = await supabase
      .from("content_calendar")
      .update({ production_status: "Ready to Record / Scripted" })
      .eq("id", contentId);
    if (statusError) throw new Error(statusError.message);
  }

  const { error: ideaUpdateError } = await supabase
    .from("ideas")
    .update({ migrated_to_content_id: contentId, status: "Ready to work" })
    .eq("id", ideaId);
  if (ideaUpdateError) throw new Error(ideaUpdateError.message);

  revalidatePath("/ideas");
  redirect(`/calendar/${contentId}`);
}

export async function deleteIdea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ideas");
  redirect("/ideas");
}
