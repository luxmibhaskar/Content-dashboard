"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

export async function saveWeeklyReview(formData: FormData) {
  const weekStartDate = String(formData.get("week_start_date") ?? "");
  const weekEndDate = String(formData.get("week_end_date") ?? "");
  if (!weekStartDate || !weekEndDate) {
    throw new Error("Missing week dates.");
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { error } = await supabase.from("weekly_reviews").upsert(
    {
      brand,
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      posted_as_planned: str(formData, "posted_as_planned"),
      pillar_balance_notes: str(formData, "pillar_balance_notes"),
      retention_drop_patterns: str(formData, "retention_drop_patterns"),
      hook_library_insights: str(formData, "hook_library_insights"),
      earned_click_updates: str(formData, "earned_click_updates"),
      next_week_adjustment: str(formData, "next_week_adjustment"),
    },
    { onConflict: "brand,week_start_date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/review");
  revalidatePath("/");
}
