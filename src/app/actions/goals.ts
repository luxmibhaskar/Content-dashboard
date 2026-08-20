"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { isViewsGoal, matchedAutoPullPlatform } from "@/lib/goals";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

function num(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// current_value is skipped (stored null) whenever platform_name matches
// an auto-pull source, "views" or an exact PLATFORMS name, that one's
// computed live at render time (src/lib/goals.ts
// resolveGoalCurrentValues), a stored value here would just go stale.
// Generalizes the old Views-only special case to every auto-pull
// source.
function currentValueFor(platformName: string | null, formData: FormData) {
  if (isViewsGoal(platformName) || matchedAutoPullPlatform(platformName)) return null;
  return num(formData, "current_value");
}

// Streak & Goals redesign: goals are per-platform now (any platform,
// freeform name + an icon), not the old fixed target_metric list, see
// supabase/migrations/0013_platform_goals.sql. Add/edit lives on the
// dedicated /streaks-goals page, the same inline CRUD interaction this
// already had, just relocated off Dashboard.
export async function addGoal(formData: FormData) {
  const platformName = str(formData, "platform_name");
  if (!platformName) return;

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    brand,
    // goal_text stays not-null in the schema (superseded, no dedicated
    // UI of its own), mirrors platform_name so it's never left blank.
    goal_text: platformName,
    platform_name: platformName,
    icon_slug: str(formData, "icon_slug"),
    target_value: num(formData, "target_value"),
    current_value: currentValueFor(platformName, formData),
    target_date: str(formData, "target_date"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function updateGoal(goalId: string, formData: FormData) {
  const platformName = str(formData, "platform_name");
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({
      ...(platformName ? { platform_name: platformName, goal_text: platformName } : {}),
      icon_slug: str(formData, "icon_slug"),
      target_value: num(formData, "target_value"),
      current_value: currentValueFor(platformName, formData),
      target_date: str(formData, "target_date"),
      status: str(formData, "status"),
    })
    .eq("id", goalId);

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
