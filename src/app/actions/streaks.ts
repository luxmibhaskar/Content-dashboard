"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { todayDateKey } from "@/lib/streaks";

// Streak & Goals redesign: generalized from the old logTodayStreak,
// which hardcoded today's date. streak_date now comes from the form (a
// hidden field for the "log today" flow, a real date input for "log a
// past day", src/app/(app)/streaks-goals/streak-log-form.tsx), falling
// back to today only if the field is somehow missing. The upsert target
// (brand, streak_date) and daily_streaks schema already supported an
// arbitrary date, streak_date has always been a real date column, this
// action was the only place still assuming "today".
export async function logStreakEntry(formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const streakDate = String(formData.get("streak_date") ?? "") || todayDateKey();
  const walked = formData.get("walked") === "on";
  const posted = formData.get("posted") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_streaks")
    .upsert(
      { brand, streak_date: streakDate, walked, posted },
      { onConflict: "brand,streak_date" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
