"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { isViewsGoal } from "@/lib/goals";
import { logPlatformSnapshot } from "@/app/actions/platforms";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

function num(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Platforms/Streak & Goals consolidation: current_value is never
// written to the goals row anymore, for any platform, platform_snapshots
// is the single source of truth for that number now (src/lib/goals.ts),
// goals.current_value stays in the schema for old rows only, superseded.
// A submitted current-count value instead writes a platform_snapshots
// row directly, same effect the old Platforms modal had. Views goals
// don't get a snapshot at all, that number comes from Analytics, not
// something to manually log here.
async function maybeLogCurrentValue(brand: string, platformName: string | null, formData: FormData) {
  if (!platformName || isViewsGoal(platformName)) return;
  const current = num(formData, "current_value");
  if (current === null) return;
  await logPlatformSnapshot(brand, platformName, current);
}

// Goals are per-platform (any platform, freeform name + an icon), not
// the old fixed target_metric list, see
// supabase/migrations/0013_platform_goals.sql. Add/edit lives in the
// Streak & Goals modal now (src/components/streak-goals-modal.tsx),
// same inline CRUD interaction this already had, just relocated off
// its old dedicated page.
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
    target_date: str(formData, "target_date"),
    source_ref: str(formData, "source_ref"),
  });

  if (error) throw new Error(error.message);
  await maybeLogCurrentValue(brand, platformName, formData);
  revalidatePath("/", "layout");
}

export async function updateGoal(goalId: string, formData: FormData) {
  const platformName = str(formData, "platform_name");

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({
      ...(platformName ? { platform_name: platformName, goal_text: platformName } : {}),
      icon_slug: str(formData, "icon_slug"),
      target_value: num(formData, "target_value"),
      target_date: str(formData, "target_date"),
      status: str(formData, "status"),
      // GROUP J: only overwrite source_ref when the field was actually
      // present in this submit (YouTube cards), never blank it out for
      // every other platform whose form has no such input.
      ...(formData.has("source_ref") ? { source_ref: str(formData, "source_ref") } : {}),
    })
    .eq("id", goalId);

  if (error) throw new Error(error.message);
  await maybeLogCurrentValue(brand, platformName, formData);
  revalidatePath("/", "layout");
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
