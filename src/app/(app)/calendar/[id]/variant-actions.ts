"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

// Every mutation in this file was previously fire-and-forget: if any of
// them failed (RLS edge case, transient network error, whatever), the
// action would still redirect as if it succeeded, is_live could end up
// set with content_calendar left unsynced, and nothing would ever
// surface it. Every other action file in this app checks {error} and
// throws, this one didn't. Routing every call through here closes that
// gap, a real failure now becomes a visible error instead of a silent
// no-op.
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

export async function addTitleVariant(contentId: string, formData: FormData) {
  const text = str(formData, "variant_text");
  if (text) {
    const supabase = await createClient();
    const brand = await getContentBrand(supabase, contentId);
    await exec(
      supabase
        .from("title_variants")
        .insert({ content_id: contentId, brand, variant_text: text, source: "Custom" }),
    );
  }
  redirect(`/calendar/${contentId}`);
}

export async function addHookVariant(contentId: string, formData: FormData) {
  const text = str(formData, "variant_text");
  if (text) {
    const supabase = await createClient();
    const brand = await getContentBrand(supabase, contentId);
    await exec(
      supabase
        .from("hook_variants")
        .insert({ content_id: contentId, brand, variant_text: text, source: "Custom" }),
    );
  }
  redirect(`/calendar/${contentId}`);
}

export async function addThumbnailVariant(contentId: string, formData: FormData) {
  const supabase = await createClient();
  const brand = await getContentBrand(supabase, contentId);
  await exec(
    supabase.from("thumbnail_variants").insert({
      content_id: contentId,
      brand,
      source: "Custom",
      concept: str(formData, "concept"),
      main_text_on_image: str(formData, "main_text_on_image"),
      visual_elements: str(formData, "visual_elements"),
      emotion_vibe: str(formData, "emotion_vibe"),
    }),
  );
  redirect(`/calendar/${contentId}`);
}

// Section 10.1.3: "Use This" is radio-style exclusive, one live variant
// per type per item, and it's what drives the Copy-Ready panel (title
// syncs final_title, hook syncs final_title_hook), the Hook Library
// aggregation, and the repurposing header display.
export async function useTitleVariant(contentId: string, variantId: string, variantText: string) {
  const supabase = await createClient();
  await exec(supabase.from("title_variants").update({ is_live: false }).eq("content_id", contentId));
  await exec(supabase.from("title_variants").update({ is_live: true }).eq("id", variantId));
  await exec(supabase.from("content_calendar").update({ final_title: variantText }).eq("id", contentId));
  redirect(`/calendar/${contentId}`);
}

export async function useHookVariant(contentId: string, variantId: string, variantText: string) {
  const supabase = await createClient();
  await exec(supabase.from("hook_variants").update({ is_live: false }).eq("content_id", contentId));
  await exec(supabase.from("hook_variants").update({ is_live: true }).eq("id", variantId));
  await exec(
    supabase.from("content_calendar").update({ final_title_hook: variantText }).eq("id", contentId),
  );
  redirect(`/calendar/${contentId}`);
}

export async function useThumbnailVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await exec(
    supabase.from("thumbnail_variants").update({ is_live: false }).eq("content_id", contentId),
  );
  await exec(supabase.from("thumbnail_variants").update({ is_live: true }).eq("id", variantId));
  redirect(`/calendar/${contentId}`);
}

export async function deleteTitleVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await exec(supabase.from("title_variants").delete().eq("id", variantId));
  redirect(`/calendar/${contentId}`);
}

export async function deleteHookVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await exec(supabase.from("hook_variants").delete().eq("id", variantId));
  redirect(`/calendar/${contentId}`);
}

export async function deleteThumbnailVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await exec(supabase.from("thumbnail_variants").delete().eq("id", variantId));
  redirect(`/calendar/${contentId}`);
}
