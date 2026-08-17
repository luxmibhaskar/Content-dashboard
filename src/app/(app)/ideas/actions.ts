"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

// Section 8.2 step 1: "New idea captured here (fast, < 1 min)." Stays on
// this same page after submit, no redirect, so capturing several ideas
// in a row doesn't mean re-navigating each time.
export async function createIdea(formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const ideaTitle = str(formData, "idea_title");
  if (!ideaTitle) return;

  const supabase = await createClient();
  const { error } = await supabase.from("ideas").insert({
    brand,
    idea_title: ideaTitle,
    pillar: str(formData, "pillar"),
    sub_topic: str(formData, "sub_topic"),
    format: str(formData, "format"),
    brief_description: str(formData, "brief_description"),
    reference_url: str(formData, "reference_url"),
    idea_source: str(formData, "idea_source"),
    source_detail: str(formData, "source_detail"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/ideas");
}
