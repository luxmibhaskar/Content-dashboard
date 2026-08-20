"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

// docs/topic-page-redesign.md Section 1: the "+ New" form is condensed
// to Title, Brief Description, Keywords only, everything else fills in
// from the topic page itself. final_title mirrors the title too (not
// left blank), same reasoning as the Idea Panel's ensureMigrated: an
// empty "Untitled" header on a row that's already real underneath reads
// as broken, not as "not polished yet."
export async function createContentItem(formData: FormData) {
  const title = str(formData, "title");
  if (!title) {
    throw new Error("Title is required.");
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      brand,
      final_title: title,
      raw_idea_title: title,
      brief_intent: str(formData, "brief_description"),
      raw_keywords_topics: str(formData, "keywords"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content item.");
  }

  // "+ New (Manual)" carries `entry=manual` through from the form
  // (src/app/(app)/calendar/new/page.tsx) so the topic page knows to
  // lead with "Paste from AI chat" expanded instead of Run, "+ New (AI
  // Research)" carries nothing and lands exactly as it always has.
  const entry = str(formData, "entry");
  redirect(`/calendar/${data.id}${entry === "manual" ? "?entry=manual" : ""}`);
}
