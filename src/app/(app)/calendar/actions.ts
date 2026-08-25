"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

// docs/topic-page-redesign.md Section 1: a single "+ New" button, no
// pre-form, no pre-paste-popup. Title/Brief Description/Keywords used
// to be collected here (or, on the old Manual entry point, the item's
// creation itself was deferred until a paste succeeded and its title
// derived from that parse) - both of those depended on some input
// existing before the item did. Neither does anymore: that same input
// now lives in the Research phase on both the Manual and AI sides of
// the topic page itself, collected there instead of twice. So creation
// is unconditional and immediate: a blank row, a literal "Untitled"
// title (not left blank, an empty header on a row that's already real
// underneath reads as broken, not as "not polished yet"), straight to
// the new topic page. TopicPageTabs already defaults every topic page
// to the AI area regardless of how the item was created, so this needs
// no entry param to land there, it's already where things land.
export async function createBlankContentItem() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      brand,
      final_title: "Untitled",
      raw_idea_title: "Untitled",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content item.");
  }

  redirect(`/calendar/${data.id}`);
}
