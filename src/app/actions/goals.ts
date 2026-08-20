"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

function num(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Section 6.5: 2-3 active goals at a time is the realistic use case, so
// this is deliberately CRUD-in-a-strip rather than a separate management
// page, add/edit/delete all live inline on the Dashboard progress strip.
export async function addGoal(formData: FormData) {
  const goalText = str(formData, "goal_text");
  if (!goalText) return;

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    brand,
    goal_text: goalText,
    target_metric: str(formData, "target_metric"),
    target_value: num(formData, "target_value"),
    current_value: num(formData, "current_value"),
    target_date: str(formData, "target_date"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// current_value is skipped for the Views metric, that one is pulled live
// from Analytics on render (Section 6.5), a stored value here would just
// go stale and never be shown anyway.
export async function updateGoal(goalId: string, formData: FormData) {
  const targetMetric = str(formData, "target_metric");
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({
      goal_text: str(formData, "goal_text"),
      target_metric: targetMetric,
      target_value: num(formData, "target_value"),
      current_value: targetMetric === "Views" ? null : num(formData, "current_value"),
      target_date: str(formData, "target_date"),
      status: str(formData, "status"),
    })
    .eq("id", goalId);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
