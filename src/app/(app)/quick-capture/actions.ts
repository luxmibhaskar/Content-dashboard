"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

async function exec(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  if (error) throw new Error(error.message);
}

async function currentBrand() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  return isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;
}

export async function addQuickCapture(formData: FormData) {
  const url = str(formData, "url");
  if (!url) return;

  const brand = await currentBrand();
  const supabase = await createClient();
  await exec(
    supabase.from("quick_capture").insert({
      brand,
      url,
      pillar: str(formData, "pillar"),
      content_type: str(formData, "content_type"),
      competitor_name: str(formData, "competitor_name"),
    }),
  );
  revalidatePath("/quick-capture");
}

export async function updateQuickCapture(captureId: string, formData: FormData) {
  const supabase = await createClient();
  await exec(
    supabase
      .from("quick_capture")
      .update({
        pillar: str(formData, "pillar"),
        quick_hook_notes: str(formData, "quick_hook_notes"),
        quick_rehook_notes: str(formData, "quick_rehook_notes"),
        quick_cta_notes: str(formData, "quick_cta_notes"),
        content_type: str(formData, "content_type"),
        competitor_name: str(formData, "competitor_name"),
        status: str(formData, "status"),
      })
      .eq("id", captureId),
  );
  revalidatePath("/quick-capture");
}

export async function deleteQuickCapture(captureId: string) {
  const supabase = await createClient();
  await exec(supabase.from("quick_capture").delete().eq("id", captureId));
  revalidatePath("/quick-capture");
}

// Section 13: "During Weekly Review or topic planning, move relevant
// items into ideas (if it sparks a new idea), or competitor_benchmarks
// for a specific topic, or reference_videos for a specific topic."
export async function migrateToIdea(captureId: string) {
  const supabase = await createClient();
  const { data: capture, error: findError } = await supabase
    .from("quick_capture")
    .select("brand, url, pillar, quick_hook_notes, quick_rehook_notes, quick_cta_notes")
    .eq("id", captureId)
    .single();
  if (findError || !capture) throw new Error(findError?.message ?? "Quick capture item not found.");

  const notes = [capture.quick_hook_notes, capture.quick_rehook_notes, capture.quick_cta_notes]
    .filter(Boolean)
    .join(" / ");

  await exec(
    supabase.from("ideas").insert({
      brand: capture.brand,
      idea_title: capture.pillar ? `${capture.pillar} idea from Quick Capture` : "Idea from Quick Capture",
      pillar: capture.pillar,
      reference_url: capture.url,
      brief_description: notes || null,
      idea_source: "Internet",
      source_detail: "Migrated from Quick Capture",
    }),
  );
  await exec(supabase.from("quick_capture").update({ status: "Migrated" }).eq("id", captureId));
  revalidatePath("/quick-capture");
}

export async function migrateToReferenceVideo(captureId: string, formData: FormData) {
  const contentId = str(formData, "content_id");
  if (!contentId) throw new Error("Pick a content item to migrate this into first.");

  const supabase = await createClient();
  const { data: capture, error: findError } = await supabase
    .from("quick_capture")
    .select("brand, url, quick_hook_notes, quick_rehook_notes, quick_cta_notes")
    .eq("id", captureId)
    .single();
  if (findError || !capture) throw new Error(findError?.message ?? "Quick capture item not found.");

  await exec(
    supabase.from("reference_videos").insert({
      content_id: contentId,
      brand: capture.brand,
      url: capture.url,
      hook_note: capture.quick_hook_notes,
      rehook_note: capture.quick_rehook_notes,
      cta_note: capture.quick_cta_notes,
    }),
  );
  await exec(supabase.from("quick_capture").update({ status: "Migrated" }).eq("id", captureId));
  revalidatePath("/quick-capture");
}

export async function migrateToCompetitorBenchmark(captureId: string, formData: FormData) {
  const contentId = str(formData, "content_id");
  if (!contentId) throw new Error("Pick a content item to migrate this into first.");

  const supabase = await createClient();
  const { data: capture, error: findError } = await supabase
    .from("quick_capture")
    .select("brand, url, competitor_name, quick_hook_notes, quick_rehook_notes, quick_cta_notes")
    .eq("id", captureId)
    .single();
  if (findError || !capture) throw new Error(findError?.message ?? "Quick capture item not found.");

  const whyBenchmark = [capture.quick_hook_notes, capture.quick_rehook_notes, capture.quick_cta_notes]
    .filter(Boolean)
    .join(" / ") || null;

  await exec(
    supabase.from("competitor_benchmarks").insert({
      content_id: contentId,
      brand: capture.brand,
      competitor_name: capture.competitor_name,
      url: capture.url,
      why_benchmark: whyBenchmark,
    }),
  );
  await exec(supabase.from("quick_capture").update({ status: "Migrated" }).eq("id", captureId));
  revalidatePath("/quick-capture");
}
