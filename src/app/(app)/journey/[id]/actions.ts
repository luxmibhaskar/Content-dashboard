"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

export async function updateJourneyEntry(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("journey_log")
    .update({
      entry_date: String(formData.get("entry_date") ?? ""),
      pillar_focus: formData.getAll("pillar_focus").map(String),
      sub_topic: formData.getAll("sub_topic").map(String),
      what_i_did_experienced: str(formData, "what_i_did_experienced"),
      key_lesson_insight: str(formData, "key_lesson_insight"),
      proof_results: str(formData, "proof_results"),
      mood_energy: str(formData, "mood_energy"),
      tags_keywords: str(formData, "tags_keywords"),
      angle_worthy: formData.get("angle_worthy") === "on",
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/journey");
  // The detail page's own Past Journey Log list reads journey_log too, so
  // revalidate this route as well, not just the index.
  revalidatePath("/journey/[id]", "page");
  // ?saved=<ts> drives <SaveToast> on the detail page, this redirect
  // lands back on the same URL and otherwise gives no visible signal the
  // save worked. Fresh timestamp each save so repeats re-trigger it.
  redirect(`/journey/${id}?saved=${Date.now()}`);
}

export async function deleteJourneyEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("journey_log").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/journey");
  redirect("/journey");
}
