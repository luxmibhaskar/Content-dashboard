"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

export async function updateCompetitor(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("competitors")
    .update({
      name: str(formData, "name") ?? "",
      platform: str(formData, "platform"),
      profile_url: str(formData, "profile_url"),
      notes: str(formData, "notes"),
      active: formData.get("active") === "on",
      sub_topics: formData.getAll("sub_topics").map(String),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/competitors");
  redirect(`/competitors/${id}`);
}

export async function deleteCompetitor(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/competitors");
  redirect("/competitors");
}
