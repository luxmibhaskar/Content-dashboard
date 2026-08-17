"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") || null;
}

export async function createCompetitor(formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const name = str(formData, "name");
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("competitors").insert({
    brand,
    name,
    platform: str(formData, "platform"),
    profile_url: str(formData, "profile_url"),
    notes: str(formData, "notes"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/competitors");
}
