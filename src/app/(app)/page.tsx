import { cookies } from "next/headers";
import { BRAND_COOKIE, BRAND_LABELS, DEFAULT_BRAND, isBrand } from "@/lib/brand";

export default async function TodayPage() {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Today &middot; {BRAND_LABELS[brand]}</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in. Auth and the Brand Switcher are wired up, the rest of
        Today (streaks, next-up suggestions) comes in a later chunk.
      </p>
    </div>
  );
}
