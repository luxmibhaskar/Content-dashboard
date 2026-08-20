"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakGoalsBar } from "@/components/streak-goals-bar";
import { StreakGoalsModal } from "@/components/streak-goals-modal";
import { signOut } from "@/app/actions/auth";
import type { Brand } from "@/lib/brand";
import type { Goal } from "@/lib/types";

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
// "More" overflow menu instead of sitting flat in the row. Platforms/
// Streak & Goals consolidation: "Streak and Goals" used to be a plain
// Link here to its own page, now it opens the pop-out modal instead
// (src/components/streak-goals-modal.tsx), rendered separately below in
// the same spot the old Platforms modal occupied, not folded into this
// array of plain Links.
const MORE_LINKS = [
  { href: "/journey", label: "My Journey Log" },
  { href: "/collaborators", label: "Collaborators" },
];

const DROPDOWN_ITEM_CLASSNAME = "block rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted";

export function TopBar({
  brand,
  userEmail,
  walkStreak,
  postStreak,
  todayWalked,
  todayPosted,
  goals,
}: {
  brand: Brand;
  userEmail: string | null;
  walkStreak: number;
  postStreak: number;
  todayWalked: boolean;
  todayPosted: boolean;
  goals: Goal[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Lifted here (not inside StreakGoalsModal) because it needs to open
  // from more than one place: the "More" menu item below, the mobile
  // menu's equivalent, and the top-bar shuffle display's empty-state
  // prompt (src/components/streak-goals-bar.tsx). One controlled Dialog
  // instance, several external triggers.
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);

  return (
    <header className="border-b border-border">
      <div className="flex justify-center border-b border-border px-4 py-3">
        <BrandSwitcher brand={brand} />
      </div>

      {/* Layout follow-up: nav links + More dropdown moved from the left
          side of this row to the right, between the day/night toggle
          and Sign out, "|" dividers between each so they read as
          distinct items rather than crammed together. Streak/goals
          display moved into the now-open left side, no longer its own
          separate row (see StreakGoalsBar, its own wrapping row/border
          is gone, it renders inline content only now). */}
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <StreakGoalsBar
          walkStreak={walkStreak}
          postStreak={postStreak}
          goals={goals}
          onOpenGoalsModal={() => setGoalsModalOpen(true)}
        />

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <nav className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            {NAV_LINKS.map((link, i) => (
              <Fragment key={link.href}>
                {i > 0 && (
                  <span aria-hidden="true" className="text-border">
                    |
                  </span>
                )}
                <Link href={link.href} className="hover:text-foreground">
                  {link.label}
                </Link>
              </Fragment>
            ))}
            <span aria-hidden="true" className="text-border">
              |
            </span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-0.5 outline-none hover:text-foreground aria-expanded:text-foreground"
                >
                  More
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
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
                  <DropdownMenu.Item asChild>
                    <button
                      type="button"
                      onClick={() => setGoalsModalOpen(true)}
                      className={`${DROPDOWN_ITEM_CLASSNAME} w-full text-left`}
                    >
                      Streak and Goals
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>
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
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setGoalsModalOpen(true);
            }}
            className="block w-full rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Streak and Goals
          </button>
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

      <StreakGoalsModal
        open={goalsModalOpen}
        onOpenChange={setGoalsModalOpen}
        walkStreak={walkStreak}
        postStreak={postStreak}
        todayWalked={todayWalked}
        todayPosted={todayPosted}
        goals={goals}
      />
    </header>
  );
}
