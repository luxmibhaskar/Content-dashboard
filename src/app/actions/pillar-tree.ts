"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

async function currentBrand() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  return isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;
}

// Section 15.1: tapping into an empty branch should let a first topic
// get added right there, the tree's own empty-state guidance rather
// than bouncing over to Content Calendar's own + New.
export async function createTopicUnderBranch(pillar: string, subTopic: string) {
  const brand = await currentBrand();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({ brand, pillar, sub_topic: subTopic })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create topic.");
  redirect(`/calendar/${data.id}`);
}

// Section 15.1: "Some unlock automatically via streak/tracker data,
// others manually" - manual unlock lives here, on the tree itself,
// since that's where locked topics are actually seen and worked with.
// The tree now lives at the top of Today, not its own route.
export async function updateLockState(contentId: string, formData: FormData) {
  const isLocked = formData.get("is_locked") === "on";
  const unlockCondition = String(formData.get("unlock_condition") ?? "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ is_locked: isLocked, unlock_condition: unlockCondition })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
