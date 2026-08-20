"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { pillarsFor } from "@/lib/pillars";

export async function addCustomSubTopic(formData: FormData) {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  const pillar = String(formData.get("pillar") ?? "").trim();
  const subTopic = String(formData.get("sub_topic") ?? "").trim();

  // Defensive only, the form's own pillar select already only offers
  // this brand's real pillars, pillars themselves aren't extensible.
  if (!pillar || !subTopic || !pillarsFor(brand).includes(pillar)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_sub_topics")
    .insert({ brand, pillar, sub_topic: subTopic });

  // 23505 = unique_violation (brand, pillar, sub_topic already exists),
  // treated as a no-op rather than an error, re-adding an existing
  // custom sub-topic shouldn't surface a failure to the user.
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  revalidatePath("/topic-map");
}
