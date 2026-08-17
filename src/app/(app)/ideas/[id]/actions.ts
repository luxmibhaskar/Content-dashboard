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
  brief_description: string | null;
  reference_url: string | null;
  idea_source: string | null;
  source_detail: string | null;
};

// Section 8.2: moving status to Research (or straight to Ready to work,
// if that's reached without passing through Research first) creates the
// full content_calendar row the first time, research_snapshots has a
// hard FK to content_calendar so a real row has to exist before
// research has anywhere to write results. production_status is left at
// its default ("Idea") since nothing's been scripted yet.
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

export async function deleteIdea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ideas").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ideas");
  redirect("/ideas");
}
