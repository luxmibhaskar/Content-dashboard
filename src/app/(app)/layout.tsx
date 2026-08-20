import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/top-bar";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import { getLatestPlatformCounts } from "@/app/actions/platforms";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;
  const platformCounts = await getLatestPlatformCounts(brand);

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar brand={brand} userEmail={user.email ?? null} platformCounts={platformCounts} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
