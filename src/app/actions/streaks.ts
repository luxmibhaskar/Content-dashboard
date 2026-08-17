"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { todayDateKey } from "@/lib/streaks";

export async function logTodayStreak(formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const walked = formData.get("walked") === "on";
  const posted = formData.get("posted") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("daily_streaks")
    .upsert(
      { brand, streak_date: todayDateKey(), walked, posted },
      { onConflict: "brand,streak_date" },
    );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}
