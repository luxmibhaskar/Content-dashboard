"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { todayDateKey } from "@/lib/streaks";

export async function createJourneyEntry() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_log")
    .insert({ brand, entry_date: todayDateKey() })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create journey entry.");
  }

  redirect(`/journey/${data.id}`);
}
