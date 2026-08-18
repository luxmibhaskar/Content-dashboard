"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

async function exec(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) {
    throw new Error(error.message);
  }
}

async function getContentBrand(supabase: Awaited<ReturnType<typeof createClient>>, contentId: string) {
  const { data, error } = await supabase
    .from("content_calendar")
    .select("brand")
    .eq("id", contentId)
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Content item not found.");
  }
  return data.brand as string;
}

// Section 10.2.1: manually-added TikTok/IG links, there's no reliable API
// for either platform (Section 16), so this stays paste-a-link plus notes.
export async function addReferenceVideo(contentId: string, formData: FormData) {
  const url = str(formData, "url");
  if (url) {
    const supabase = await createClient();
    const brand = await getContentBrand(supabase, contentId);
    await exec(supabase.from("reference_videos").insert({ content_id: contentId, brand, url }));
  }
  redirect(`/calendar/${contentId}/research`);
}

export async function updateReferenceVideoNotes(contentId: string, videoId: string, formData: FormData) {
  const supabase = await createClient();
  await exec(
    supabase
      .from("reference_videos")
      .update({
        hook_note: str(formData, "hook_note"),
        rehook_note: str(formData, "rehook_note"),
        cta_note: str(formData, "cta_note"),
      })
      .eq("id", videoId),
  );
  redirect(`/calendar/${contentId}/research`);
}

export async function deleteReferenceVideo(contentId: string, videoId: string) {
  const supabase = await createClient();
  await exec(supabase.from("reference_videos").delete().eq("id", videoId));
  redirect(`/calendar/${contentId}/research`);
}
