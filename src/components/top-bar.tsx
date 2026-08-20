"use client";

import { useState } from "react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformsModal } from "@/components/platforms-modal";
import { signOut } from "@/app/actions/auth";
import type { Brand } from "@/lib/brand";
import type { Platform } from "@/lib/platforms";

// docs/topic-page-redesign.md Section 3: Personal Angle Bank is gone as
// a separate nav item, it's a toggle inside My Journey Log now (see
// src/app/(app)/journey/page.tsx). Quick Capture is gone as a nav item,
// replaced by the Dashboard page's own quick-entry box (see
// src/app/(app)/page.tsx), the underlying /quick-capture page and its
// migrate-to-X actions stay intact, just unlinked from nav, nothing in
// the spec asked for that data path itself to be removed.
//
// Command Center redesign: Analytics Overview, Content Calendar, Hook
// Library, and Competitors are also gone from here, relocated to the
// Quick Access cards on Dashboard (still one click away, not removed).
//
// Layout follow-up: label changed from "Today" to "Dashboard", same
// page (/) and content, label only.
const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/ideas", label: "Idea Panel" },
  { href: "/review", label: "Review" },
];

// Section 3: "the main top bar has gotten crowded", these move into a
// "More" overflow menu instead of sitting flat in the row. Platforms
// joined them per a later layout follow-up, it's a Dialog trigger, not
// a Link, rendered separately below rather than folded into this array.
const MORE_LINKS = [
  { href: "/journey", label: "My Journey Log" },
  { href: "/collaborators", label: "Collaborators" },
];

const DROPDOWN_ITEM_CLASSNAME = "block rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted";

export function TopBar({
  brand,
  userEmail,
  platformCounts,
}: {
  brand: Brand;
  userEmail: string | null;
  platformCounts: Partial<Record<Platform, number>>;
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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-0.5 text-sm text-muted-foreground outline-none hover:text-foreground aria-expanded:text-foreground"
              >
                More
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={10}
                className="z-50 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
              >
                {MORE_LINKS.map((link) => (
                  <DropdownMenu.Item key={link.href} asChild>
                    <Link
                      href={link.href}
                      className={DROPDOWN_ITEM_CLASSNAME}
                    >
                      {link.label}
                    </Link>
                  </DropdownMenu.Item>
                ))}
                {/* Not a DropdownMenu.Item: it opens a separate Dialog
                    (src/components/platforms-modal.tsx) rather than
                    navigating, asChild would merge the Item's own
                    trigger props onto Dialog.Root, which doesn't
                    forward them anywhere meaningful. */}
                <PlatformsModal initialCounts={platformCounts} triggerClassName={`${DROPDOWN_ITEM_CLASSNAME} w-full text-left`} />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
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
          {[...NAV_LINKS, ...MORE_LINKS].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <PlatformsModal
            initialCounts={platformCounts}
            triggerClassName="block w-full rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          />
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
