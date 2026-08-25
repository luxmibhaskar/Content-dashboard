"use server";

import { revalidatePath } from "next/cache";
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
// revalidatePath, not redirect: Reference Videos is a tab on the topic
// page now (topic-page-tabs.tsx), same as Research & Copy and Scripts,
// which both revalidate the same `/calendar/${contentId}` route rather
// than navigating anywhere. This file used to redirect to the standalone
// `/calendar/[id]/research` subpage that predated the tabbed redesign;
// that route was removed entirely (topic-page-redesign.md Section 2),
// so the leftover redirect() calls were bouncing every Add/Remove/Save
// here to a dead route (404) instead of just refreshing in place.
export async function addReferenceVideo(contentId: string, formData: FormData) {
  const url = str(formData, "url");
  if (url) {
    const supabase = await createClient();
    const brand = await getContentBrand(supabase, contentId);
    await exec(supabase.from("reference_videos").insert({ content_id: contentId, brand, url }));
  }
  revalidatePath(`/calendar/${contentId}`);
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
  revalidatePath(`/calendar/${contentId}`);
}

export async function deleteReferenceVideo(contentId: string, videoId: string) {
  const supabase = await createClient();
  await exec(supabase.from("reference_videos").delete().eq("id", videoId));
  revalidatePath(`/calendar/${contentId}`);
}
