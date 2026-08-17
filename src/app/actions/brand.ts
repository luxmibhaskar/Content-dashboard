"use server";

import { cookies } from "next/headers";
import { BRAND_COOKIE, isBrand, type Brand } from "@/lib/brand";

export async function setBrand(brand: Brand) {
  if (!isBrand(brand)) return;

  const cookieStore = await cookies();
  cookieStore.set(BRAND_COOKIE, brand, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
