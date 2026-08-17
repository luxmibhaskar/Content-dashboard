"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";

export async function createContentItem() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .insert({ brand })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create content item.");
  }

  redirect(`/calendar/${data.id}`);
}
