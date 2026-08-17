"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateContentItem(id: string, formData: FormData) {
  const supabase = await createClient();

  const publishDateRaw = String(formData.get("publish_date") ?? "");

  const { error } = await supabase
    .from("content_calendar")
    .update({
      final_title: String(formData.get("final_title") ?? "") || null,
      production_status: String(formData.get("production_status")),
      viability_status: String(formData.get("viability_status")),
      viability_reason_note:
        String(formData.get("viability_reason_note") ?? "") || null,
      pillar: String(formData.get("pillar") ?? "") || null,
      sub_topic: String(formData.get("sub_topic") ?? "") || null,
      format: String(formData.get("format") ?? "") || null,
      publish_date: publishDateRaw ? new Date(publishDateRaw).toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/calendar/${id}`);
  revalidatePath("/calendar");
}
