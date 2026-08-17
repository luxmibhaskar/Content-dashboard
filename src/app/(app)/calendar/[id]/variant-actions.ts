"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

async function getContentBrand(supabase: Awaited<ReturnType<typeof createClient>>, contentId: string) {
  const { data } = await supabase.from("content_calendar").select("brand").eq("id", contentId).single();
  if (!data) {
    throw new Error("Content item not found.");
  }
  return data.brand as string;
}

export async function addTitleVariant(contentId: string, formData: FormData) {
  const text = str(formData, "variant_text");
  if (text) {
    const supabase = await createClient();
    const brand = await getContentBrand(supabase, contentId);
    await supabase
      .from("title_variants")
      .insert({ content_id: contentId, brand, variant_text: text, source: "Custom" });
  }
  redirect(`/calendar/${contentId}`);
}

export async function addHookVariant(contentId: string, formData: FormData) {
  const text = str(formData, "variant_text");
  if (text) {
    const supabase = await createClient();
    const brand = await getContentBrand(supabase, contentId);
    await supabase
      .from("hook_variants")
      .insert({ content_id: contentId, brand, variant_text: text, source: "Custom" });
  }
  redirect(`/calendar/${contentId}`);
}

export async function addThumbnailVariant(contentId: string, formData: FormData) {
  const supabase = await createClient();
  const brand = await getContentBrand(supabase, contentId);
  await supabase.from("thumbnail_variants").insert({
    content_id: contentId,
    brand,
    source: "Custom",
    concept: str(formData, "concept"),
    main_text_on_image: str(formData, "main_text_on_image"),
    visual_elements: str(formData, "visual_elements"),
    emotion_vibe: str(formData, "emotion_vibe"),
  });
  redirect(`/calendar/${contentId}`);
}

// Section 10.1.3: "Use This" is radio-style exclusive, one live variant
// per type per item, and it's what drives the Copy-Ready panel (title
// syncs final_title, hook syncs final_title_hook), the Hook Library
// aggregation, and the repurposing header display.
export async function useTitleVariant(contentId: string, variantId: string, variantText: string) {
  const supabase = await createClient();
  await supabase.from("title_variants").update({ is_live: false }).eq("content_id", contentId);
  await supabase.from("title_variants").update({ is_live: true }).eq("id", variantId);
  await supabase.from("content_calendar").update({ final_title: variantText }).eq("id", contentId);
  redirect(`/calendar/${contentId}`);
}

export async function useHookVariant(contentId: string, variantId: string, variantText: string) {
  const supabase = await createClient();
  await supabase.from("hook_variants").update({ is_live: false }).eq("content_id", contentId);
  await supabase.from("hook_variants").update({ is_live: true }).eq("id", variantId);
  await supabase.from("content_calendar").update({ final_title_hook: variantText }).eq("id", contentId);
  redirect(`/calendar/${contentId}`);
}

export async function useThumbnailVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await supabase.from("thumbnail_variants").update({ is_live: false }).eq("content_id", contentId);
  await supabase.from("thumbnail_variants").update({ is_live: true }).eq("id", variantId);
  redirect(`/calendar/${contentId}`);
}

export async function deleteTitleVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await supabase.from("title_variants").delete().eq("id", variantId);
  redirect(`/calendar/${contentId}`);
}

export async function deleteHookVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await supabase.from("hook_variants").delete().eq("id", variantId);
  redirect(`/calendar/${contentId}`);
}

export async function deleteThumbnailVariant(contentId: string, variantId: string) {
  const supabase = await createClient();
  await supabase.from("thumbnail_variants").delete().eq("id", variantId);
  redirect(`/calendar/${contentId}`);
}
