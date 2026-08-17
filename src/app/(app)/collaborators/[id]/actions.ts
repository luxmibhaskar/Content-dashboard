"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

export async function updateCollaborator(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("collaborators")
    .update({
      name: str(formData, "name") ?? "",
      platform: str(formData, "platform"),
      profile_url: str(formData, "profile_url"),
      status: String(formData.get("status") ?? "Identified"),
      notes: str(formData, "notes"),
      last_contact_date: str(formData, "last_contact_date"),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/collaborators");
  redirect(`/collaborators/${id}`);
}

export async function deleteCollaborator(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("collaborators").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/collaborators");
  redirect("/collaborators");
}
