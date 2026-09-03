"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Per-item freeform notes (docs/topic-page-redesign.md, Notes section /
// supabase/migrations/0026_content_notes.sql). Same shape as
// reference-video-actions.ts: server actions bound to contentId, a plain
// revalidatePath of the topic route after each write (no redirect - the
// notes column just refreshes in place), brand copied off the parent row
// so the table stays brand-scoped.

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

export async function createNote(contentId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const title = str(formData, "title");
  const supabase = await createClient();
  const brand = await getContentBrand(supabase, contentId);
  await exec(
    supabase.from("content_notes").insert({
      content_id: contentId,
      brand,
      // title trimmed to null when blank so the summary-line fallback
      // (snippet, then "Untitled note") kicks in.
      title: title?.trim() || null,
      content,
    }),
  );
  revalidatePath(`/calendar/${contentId}`);
}

export async function updateNote(contentId: string, noteId: string, formData: FormData) {
  const content = String(formData.get("content") ?? "");
  const title = str(formData, "title");
  const supabase = await createClient();
  await exec(
    supabase
      .from("content_notes")
      .update({ title: title?.trim() || null, content })
      .eq("id", noteId),
  );
  // updated_at bumps via the DB trigger, so the revalidated list re-sorts
  // this note to the top.
  revalidatePath(`/calendar/${contentId}`);
}

export async function deleteNote(contentId: string, noteId: string) {
  const supabase = await createClient();
  await exec(supabase.from("content_notes").delete().eq("id", noteId));
  revalidatePath(`/calendar/${contentId}`);
}
