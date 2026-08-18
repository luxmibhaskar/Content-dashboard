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
export async function updateLockState(contentId: string, formData: FormData) {
  const isLocked = formData.get("is_locked") === "on";
  const unlockCondition = String(formData.get("unlock_condition") ?? "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ is_locked: isLocked, unlock_condition: unlockCondition })
    .eq("id", contentId);
  if (error) throw new Error(error.message);
  revalidatePath("/pillar-tree");
}

// Section 15.2: "reorderable... a sequence_order_custom field stores
// your custom order." No drag-and-drop library in this project yet,
// up/down swaps the same field a drag would, same end result for an
// 8-item planning list.
export async function moveSequenceItem(contentId: string, direction: "up" | "down") {
  const brand = await currentBrand();
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("content_calendar")
    .select("id, sequence_order_custom, sequence_step")
    .eq("brand", brand)
    .not("sequence_step", "is", null)
    .order("sequence_order_custom", { ascending: true, nullsFirst: false })
    .order("sequence_step", { ascending: true });
  if (error) throw new Error(error.message);

  const ordered = items ?? [];
  const index = ordered.findIndex((i) => i.id === contentId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= ordered.length) return;

  // Assign fresh sequential order values across the whole list so every
  // item has an explicit sequence_order_custom afterward, not just the
  // two that moved, keeps future swaps well-defined.
  const reordered = [...ordered];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  const updates = reordered.map((item, i) =>
    supabase.from("content_calendar").update({ sequence_order_custom: i + 1 }).eq("id", item.id),
  );
  const results = await Promise.all(updates);
  for (const { error: updateError } of results) {
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath("/pillar-tree");
}
