import type { Metadata } from "next";
import { Geist_Mono, Manrope, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { BRAND_COOKIE, DEFAULT_BRAND, isBrand } from "@/lib/brand";
import "./globals.css";

// docs/brand-tokens.md Typography: Manrope for LBsTransformation, Inter
// for LBsWorks ("no other fonts"). Both load here (Next.js needs a
// static import per font) and globals.css picks the right one per
// brand via --font-sans, keyed off the data-brand attribute below.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LBs Content Planning Dashboard",
  description: "Content operations dashboard for LBsTransformation and LBsWorks.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Phase G: brand tokens (docs/brand-tokens.md) are selected in
  // globals.css off this attribute, read here rather than in the (app)
  // route group layout so it's set even on pages outside that group
  // (e.g. /login).
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE)?.value;
  const brand = isBrand(brandCookie) ? brandCookie : DEFAULT_BRAND;

  return (
    <html
      lang="en"
      data-brand={brand}
      className={`${manrope.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
