"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { signOut } from "@/app/actions/auth";
import type { Brand } from "@/lib/brand";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/analytics", label: "Analytics Overview" },
  { href: "/calendar", label: "Content Calendar" },
  { href: "/ideas", label: "Idea Panel" },
  { href: "/hook-library", label: "Hook Library" },
  { href: "/angle-bank", label: "Personal Angle Bank" },
  { href: "/journey", label: "My Journey Log" },
  { href: "/quick-capture", label: "Quick Capture" },
  { href: "/review", label: "Review" },
  { href: "/competitors", label: "Competitors" },
  { href: "/collaborators", label: "Collaborators" },
];

export function TopBar({
  brand,
  userEmail,
}: {
  brand: Brand;
  userEmail: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border">
      <div className="flex justify-center border-b border-border px-4 py-3">
        <BrandSwitcher brand={brand} />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <nav className="hidden items-center gap-4 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-sm text-muted-foreground md:inline">{userEmail}</span>
          )}
          <form action={signOut} className="hidden md:block">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="text-muted-foreground hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-3">
            {userEmail && <span className="truncate text-xs text-muted-foreground">{userEmail}</span>}
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
