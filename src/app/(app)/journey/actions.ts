"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export type QuickEntryState = { error: string | null };

// docs/topic-page-redesign.md Section 4: the Dashboard page's
// quick-entry box. Whatever gets typed here goes straight into
// journey_log's own free-text field, no destination picker, no
// separate migration step, no redirect either, stays on Dashboard so
// it reads as "captured", not "now go somewhere else and finish this."
export async function quickCaptureToJourneyLog(
  _prevState: QuickEntryState,
  formData: FormData,
): Promise<QuickEntryState> {
  const text = String(formData.get("entry") ?? "").trim();
  if (!text) {
    return { error: "Nothing to save yet." };
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { error } = await supabase
    .from("journey_log")
    .insert({ brand, entry_date: todayDateKey(), what_i_did_experienced: text });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
}
