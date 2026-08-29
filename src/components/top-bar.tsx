"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakGoalsBar } from "@/components/streak-goals-bar";
import { StreakGoalsModal } from "@/components/streak-goals-modal";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
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

const MORE_LINKS = [
  { href: "/journey", label: "My Journey Log" },
  { href: "/topic-map", label: "Topic Map" },
  { href: "/collaborators", label: "Collaborators" },
];

const DROPDOWN_ITEM_CLASSNAME = "block rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted";

// Layout follow-up item 5: "/" only matches the Dashboard page itself,
// every other nav href also covers its own sub-routes (e.g. /ideas/[id]
// still lights up "Idea Panel"), so opening an idea's own page doesn't
// leave every nav item looking inactive.
function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Responsive follow-up: replaces a single flex row that wrapped onto a
// second line once nav links + the streak/goals shuffle no longer fit
// side by side, with actual progressive disclosure across 3 tiers,
// never wrapping at any width:
// - Desktop (lg+): everything inline, nav links with "|" dividers plus
//   a small More dropdown (My Journey Log/Collaborators/Streak and
//   Goals).
// - Tablet (md-lg): the nav links row folds into that same More
//   dropdown, one unified menu instead of a row that no longer fits.
// - Mobile (<md): everything folds behind the hamburger, including the
//   streak/goals shuffle and the theme toggle, only the brand switcher
//   row and the hamburger itself stay visible in the header.
// One MoreMenu component, reused with a different link set per tier,
// rather than two hand-duplicated dropdowns.
function MoreMenu({
  links,
  pathname,
  onOpenGoalsModal,
}: {
  links: { href: string; label: string }[];
  pathname: string;
  onOpenGoalsModal: () => void;
}) {
  // The dropdown itself is the "nav item" for whichever page it
  // contains while collapsed, without this the trigger looks identical
  // whether or not you're on e.g. Topic Map, the only page-level signal
  // would be inside a menu that's closed by default.
  const containsActivePage = links.some((link) => isActiveHref(pathname, link.href));

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="More menu"
          className={cn(
            // -m-1.5 offsets the extra padding so the visual footprint
            // is unchanged while the tap target reaches ~40px.
            "-m-1.5 flex min-h-10 min-w-10 items-center justify-center rounded-md p-1.5 outline-none hover:text-foreground aria-expanded:text-foreground",
            containsActivePage && "nav-link-active text-foreground",
          )}
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="nav-dropdown-content z-50 min-w-40 rounded-lg p-1 text-popover-foreground duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
        >
          {links.map((link) => (
            <DropdownMenu.Item key={link.href} asChild>
              <Link
                href={link.href}
                className={cn(DROPDOWN_ITEM_CLASSNAME, isActiveHref(pathname, link.href) && "nav-link-active")}
              >
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Item asChild>
            <button
              type="button"
              onClick={onOpenGoalsModal}
              className={`${DROPDOWN_ITEM_CLASSNAME} w-full text-left`}
            >
              Streak and Goals
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function TopBar({
  brand,
  walkStreak,
  postStreak,
  todayWalked,
  todayPosted,
  goals,
}: {
  brand: Brand;
  walkStreak: number;
  postStreak: number;
  todayWalked: boolean;
  todayPosted: boolean;
  goals: Goal[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Lifted here (not inside StreakGoalsModal) because it needs to open
  // from more than one place: the desktop/tablet More menu, the mobile
  // panel's equivalent, and the top-bar shuffle display's empty-state
  // prompt (src/components/streak-goals-bar.tsx). One controlled Dialog
  // instance, several external triggers.
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const openGoalsModal = () => setGoalsModalOpen(true);

  return (
    <header className="top-bar">
      <div className="flex justify-center border-b border-border px-4 py-3">
        <BrandSwitcher brand={brand} />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* Tablet and up only, folds behind the hamburger at mobile
            along with everything else on the right (the mobileOpen
            panel below). min-w-0 lets this shrink instead of forcing
            the row wider than the viewport, StreakGoalsBar's own
            flex-wrap stays a defensive fallback, not the primary
            responsive mechanism, there's real room at this tier. */}
        <div className="hidden min-w-0 md:flex">
          <StreakGoalsBar
            brand={brand}
            walkStreak={walkStreak}
            postStreak={postStreak}
            goals={goals}
            onOpenGoalsModal={openGoalsModal}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop only, folds into the mobile panel below. */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {/* Desktop only: nav links inline, the rest in a small More. */}
          <nav className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            {NAV_LINKS.map((link, i) => (
              <Fragment key={link.href}>
                {i > 0 && (
                  <span aria-hidden="true" className="text-border">
                    |
                  </span>
                )}
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-md px-2 py-1 hover:text-foreground",
                    isActiveHref(pathname, link.href) && "nav-link-active text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </Fragment>
            ))}
            <span aria-hidden="true" className="text-border">
              |
            </span>
            <MoreMenu links={MORE_LINKS} pathname={pathname} onOpenGoalsModal={openGoalsModal} />
          </nav>

          {/* Tablet only: nav links folded into the same More dropdown
              instead of a row that no longer fits at this width. */}
          <div className="hidden text-sm text-muted-foreground md:block lg:hidden">
            <MoreMenu links={[...NAV_LINKS, ...MORE_LINKS]} pathname={pathname} onOpenGoalsModal={openGoalsModal} />
          </div>

          {/* Tablet and up, folds into the mobile panel below. */}
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
            // -m-2 offsets the padding so the icon stays put visually
            // while the tap target reaches 44px (was a bare 20px icon).
            className="-m-2 flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile only: everything the tiers above show inline collapses
          in here, including the streak/goals shuffle and the theme
          toggle, so the header itself never has more than the brand
          switcher row and this trigger to wrap. */}
      {mobileOpen && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-3 md:hidden">
          <StreakGoalsBar
            brand={brand}
            walkStreak={walkStreak}
            postStreak={postStreak}
            goals={goals}
            onOpenGoalsModal={() => {
              setMobileOpen(false);
              openGoalsModal();
            }}
          />
          <nav className="flex flex-col gap-1">
            {[...NAV_LINKS, ...MORE_LINKS].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  isActiveHref(pathname, link.href) && "nav-link-active text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openGoalsModal();
              }}
              className="block w-full rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Streak and Goals
            </button>
          </nav>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      )}

      <StreakGoalsModal
        brand={brand}
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
