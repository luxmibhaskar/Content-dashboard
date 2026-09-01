"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSwitcher } from "@/components/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { StreakGoalsBar } from "@/components/streak-goals-bar";
import { StreakGoalsModal } from "@/components/streak-goals-modal";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { useElementWidth, useMeasuredWidths } from "@/lib/use-element-size";
import { useMediaQuery } from "@/lib/use-media-query";
import { computeOverflowCollapse } from "@/lib/overflow-collapse";
import { useStreakItems, type StreakItemId } from "@/lib/use-streak-items";
import type { Brand } from "@/lib/brand";
import type { Goal } from "@/lib/types";

// docs/topic-page-redesign.md Section 3: Personal Angle Bank is gone as
// a separate nav item, it's a toggle inside My Journey Log now (see
// src/app/(app)/journey/page.tsx). Quick Capture is gone as a nav item,
// replaced by the Dashboard page's own quick-entry box (see
// src/app/(app)/page.tsx), the underlying /quick-capture page and its
// migrate-to-X actions stay intact, just unlinked from nav.
//
// Command Center redesign: Analytics Overview, Content Calendar, Hook
// Library, and Competitors are also gone from here, relocated to the
// Quick Access cards on Dashboard (still one click away, not removed).
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

// Top bar (docs/dashboard-redesign.md "Layout follow-ups"): one adaptive
// bar at >= md, no second row. A 3-column grid (1fr / auto / 1fr) keeps
// BrandSwitcher optically centred no matter how full either side column
// is.
//
// - LEFT column: a "Streak and Goals" toggle at the edge plus, when it's
//   on, the visible streak items inline (each still gated by its own
//   visibility flag). The toggle is manual (default breakpoint-dependent,
//   see streakOpen); the items themselves are width-driven - the row is
//   flex-nowrap and hides items in priority order (walk, post, shuffle)
//   behind a "+N" badge rather than ever wrapping.
// - RIGHT column: nav links auto-collapse into the single MoreMenu, one
//   at a time as the column narrows, against what's left after the
//   never-collapse controls (ThemeToggle, MoreMenu trigger, Sign out);
//   they expand back in reverse.
// BrandSwitcher, ThemeToggle, Sign out and the MoreMenu trigger never
// collapse. Below md a fixed 3-item bar (theme / brand / hamburger) runs
// outside this system, hamburger opens the existing mobile panel.
const NAV_COLLAPSE_ORDER = [...NAV_LINKS].reverse(); // Review, then Idea Panel, then Dashboard

// Streak row collapses walk streak first, then posting streak, then the
// platform shuffle (shuffle survives longest). Same computeOverflowCollapse
// as the nav side, scoped to this row, only while the toggle is open.
const STREAK_COLLAPSE_ORDER: StreakItemId[] = ["walk-streak", "post-streak", "shuffle"];

const RIGHT_GAP = 12; // gap-3 in the right column
const NAV_GAP = 8; // gap-2 inside the nav list
const LEFT_GAP = 16; // gap-x-4 on the streak row
const TOGGLE_NEG_MARGIN = 8; // -ml-2 on the toggle, not reflected in its bounding box

const DROPDOWN_ITEM_CLASSNAME =
  "block rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus:bg-muted";

// Layout follow-up item 5: "/" only matches the Dashboard page itself,
// every other nav href also covers its own sub-routes (e.g. /ideas/[id]
// still lights up "Idea Panel").
function isActiveHref(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type PrependEntry = { id: string; interactive: boolean; active: boolean; node: ReactNode };

function MoreMenu({
  links,
  pathname,
  onOpenGoalsModal,
  prependItems = [],
}: {
  links: { href: string; label: string }[];
  pathname: string;
  onOpenGoalsModal: () => void;
  // Items collapsed out of the bar, newest first, shown above the static
  // links. Nav links stay real <Link>s (interactive); streak displays
  // are non-interactive rows.
  prependItems?: PrependEntry[];
}) {
  // The trigger stands in as the "nav item" for whichever page it holds
  // while collapsed, whether that page is a static More link or a nav
  // link that just collapsed into it.
  const containsActivePage =
    links.some((link) => isActiveHref(pathname, link.href)) || prependItems.some((item) => item.active);

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
          {prependItems.map((item) =>
            item.interactive ? (
              <DropdownMenu.Item key={item.id} asChild>
                {item.node}
              </DropdownMenu.Item>
            ) : (
              <div key={item.id} role="presentation">
                {item.node}
              </div>
            ),
          )}
          {prependItems.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-border" />}
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
  // Lifted here (not inside StreakGoalsModal) because it opens from more
  // than one place: the More menu, the mobile panel, and the shuffle
  // display's empty-state prompt. One controlled Dialog, several triggers.
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const openGoalsModal = () => setGoalsModalOpen(true);

  const streak = useStreakItems({ brand, walkStreak, postStreak, goals, onOpenGoalsModal: openGoalsModal });
  const visibleStreakItems = streak.items.filter((it) => it.visible);
  // When every streak/goal item is hidden from the Streak and Goals
  // modal (walk/post/shuffle visibility all false), the toggle
  // itself has nothing to reveal, so it's removed from the bar entirely
  // rather than left as an empty control. Live: the three visibility
  // reads live in useStreakItems via useSyncExternalStore, so re-enabling
  // an item brings the toggle straight back with no refresh.
  const anyStreakVisible = visibleStreakItems.length > 0;

  // ---- left column: "Streak and Goals" is a manual toggle, not part of
  // the width-driven collapse. Default on at lg+, off at md-lg. While
  // streakManual is null the effective state tracks the live breakpoint
  // (so a resize across lg re-applies that side's default); the first
  // click freezes it to a fixed boolean that ignores the breakpoint for
  // the rest of the session, so a deliberate choice is never discarded.
  const isMd = useMediaQuery("(min-width: 768px)");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const [streakManual, setStreakManual] = useState<boolean | null>(null);
  const streakOpen = streakManual ?? isLg;
  const toggleStreak = () => setStreakManual(!(streakManual ?? isLg));

  const leftColRef = useRef<HTMLDivElement | null>(null);
  const leftColWidth = useElementWidth(leftColRef);
  const leftMeasured = useMeasuredWidths(leftColRef, streak.measureSignature);

  const rightColRef = useRef<HTMLDivElement | null>(null);
  const rightColWidth = useElementWidth(rightColRef);
  // The right measuring rig depends on nothing dynamic (nav labels are
  // constant, active-state glow is kept off the rig); a stable signature
  // means it measures once on mount, then only on ResizeObserver / font
  // load.
  const rightMeasured = useMeasuredWidths(rightColRef, "");

  // ---- right column: nav links collapse against what's left after the
  // three never-collapse controls (each measured off a stable clone or
  // its real box) plus the three gap-3 gaps between the 4 flex children.
  const navReserved =
    (rightMeasured.__more ?? 0) +
    (rightMeasured.__theme ?? 0) +
    (rightMeasured.__signout ?? 0) +
    RIGHT_GAP * 3;
  const navBudget = rightColWidth == null ? null : rightColWidth - navReserved;
  const navItemGap = (rightMeasured.__navdiv ?? NaN) + NAV_GAP * 2;
  const navSlotWidths = NAV_COLLAPSE_ORDER.map((link) => rightMeasured[`nav:${link.href}`] ?? 0);
  const navCollapsedCount = computeOverflowCollapse(navBudget, navSlotWidths, navItemGap);
  const collapsedNav = NAV_COLLAPSE_ORDER.slice(0, navCollapsedCount);
  const visibleNav = NAV_LINKS.filter((link) => !collapsedNav.includes(link));

  // Collapsed nav links fill the MoreMenu overflow pile, most recently
  // collapsed first (Review collapses first, so it ends up lowest).
  const prependItems: PrependEntry[] = [...collapsedNav].reverse().map((link) => {
    const active = isActiveHref(pathname, link.href);
    return {
      id: `nav:${link.href}`,
      interactive: true,
      active,
      node: (
        <Link href={link.href} className={cn(DROPDOWN_ITEM_CLASSNAME, active && "nav-link-active")}>
          {link.label}
        </Link>
      ),
    };
  });

  // ---- left column: hard-cap the open streak row at one line. The
  // shuffle item's text rotates every ~4s across a range of widths, so
  // rather than re-measuring on every tick we reserve the widest goal's
  // width (max of all measured variants); the collapse decision is then
  // rotation-independent and only re-runs on a real width change or when
  // the goal set / streak counts change (streak.measureSignature). The
  // "+N" badge slot is always reserved while the toggle is open so hiding
  // an item can't free space that the badge then re-consumes.
  const streakById = new Map(streak.items.map((it) => [it.id, it]));
  const shuffleSlotWidth = Math.max(
    0,
    ...streak.shuffleVariants.map((v) => leftMeasured[`shuffle:${v.id}`] ?? 0),
  );
  const streakCandidates = STREAK_COLLAPSE_ORDER.map((id) => ({
    id,
    visible: streakById.get(id)?.visible ?? false,
    width: id === "shuffle" ? shuffleSlotWidth : (leftMeasured[id] ?? 0),
  })).filter((c) => c.visible);
  const toggleWidth = (leftMeasured.toggle ?? 0) - TOGGLE_NEG_MARGIN;
  const streakBudget =
    leftColWidth == null || toggleWidth <= 0
      ? null
      : leftColWidth - toggleWidth - LEFT_GAP - (leftMeasured.badge ?? 0) - LEFT_GAP;
  const streakCollapsedCount = streakOpen
    ? computeOverflowCollapse(
        streakBudget,
        streakCandidates.map((c) => c.width),
        LEFT_GAP,
      )
    : 0;
  const hiddenStreakIds = new Set(
    streakCandidates.slice(0, streakCollapsedCount).map((c) => c.id),
  );
  const shownStreakItems = visibleStreakItems.filter((it) => !hiddenStreakIds.has(it.id));

  return (
    <header className="top-bar">
      {/* >= md: one adaptive bar. 3-col grid keeps BrandSwitcher centred
          no matter how full the side columns get. overflow-hidden clips
          the one-frame "all expanded" flash before measurement lands
          (the MoreMenu content is portalled, so it isn't clipped). */}
      <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-3 md:grid">
        {/* LEFT: "Streak and Goals" toggle at the column edge, then (when
            on) the visible streak items inline to its right. The row is
            flex-nowrap + overflow-hidden so it can never wrap; a priority
            overflow collapse (walk streak, then posting streak, then the
            shuffle) hides items as the column narrows and shows a "+N"
            badge for whatever is tucked away. The toggle never collapses.
            The toggle is absent below md, and also when every streak item
            is hidden in settings (anyStreakVisible); in both cases the
            streak items stay in the hamburger panel only. */}
        <div
          ref={leftColRef}
          className="relative flex min-w-0 flex-nowrap items-center gap-x-4 overflow-hidden text-sm text-muted-foreground"
        >
          {isMd && anyStreakVisible && (
            <button
              type="button"
              onClick={toggleStreak}
              aria-pressed={streakOpen}
              data-measure="toggle"
              // -ml-2 pulls the padding out so the label sits flush with
              // the column edge while the tap target stays generous.
              className="-ml-2 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 hover:text-foreground aria-pressed:text-foreground"
            >
              <ChevronDown
                className={cn("size-3.5 transition-transform", !streakOpen && "-rotate-90")}
                aria-hidden="true"
              />
              Streak and Goals
            </button>
          )}
          {isMd && anyStreakVisible && streakOpen && (
            <>
              {shownStreakItems.map((it) => (
                <span key={it.id} className="shrink-0 whitespace-nowrap">
                  {it.barNode}
                </span>
              ))}
              {streakCollapsedCount > 0 && (
                <span
                  className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                  aria-label={`${streakCollapsedCount} more streak item${streakCollapsedCount > 1 ? "s" : ""} hidden`}
                >
                  +{streakCollapsedCount}
                </span>
              )}
            </>
          )}

          {/* Offscreen measuring rig, warm whenever the toggle could show
              so opening it is flicker-free. Every shuffle goal is measured
              here; the collapse maths uses the widest so the ~4s rotation
              never changes what's visible. */}
          {isMd && anyStreakVisible && (
            <div
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-4 whitespace-nowrap"
            >
              <span data-measure="walk-streak">{streakById.get("walk-streak")?.barNode}</span>
              <span data-measure="post-streak">{streakById.get("post-streak")?.barNode}</span>
              {streak.shuffleVariants.map((v) => (
                <span key={v.id} data-measure={`shuffle:${v.id}`}>
                  {v.node}
                </span>
              ))}
              <span
                data-measure="badge"
                className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                +3
              </span>
            </div>
          )}
        </div>

        {/* CENTER: never collapses */}
        <div className="flex justify-center">
          <BrandSwitcher brand={brand} />
        </div>

        {/* RIGHT: theme toggle / nav links / MoreMenu / Sign out */}
        <div
          ref={rightColRef}
          className="relative flex min-w-0 items-center justify-end gap-3 overflow-hidden"
        >
          <span data-measure="__theme">
            <ThemeToggle />
          </span>

          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            {visibleNav.map((link, i) => (
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
          </nav>

          <MoreMenu
            links={MORE_LINKS}
            pathname={pathname}
            onOpenGoalsModal={openGoalsModal}
            prependItems={prependItems}
          />

          <form action={signOut} data-measure="__signout">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>

          {/* offscreen measuring rig for the right column: a stable
              MoreMenu-trigger-sized box and one divider (both free of the
              active-state glow so the reserve stays constant), plus every
              nav label at natural width */}
          <div
            aria-hidden="true"
            className="pointer-events-none invisible absolute right-0 top-0 flex items-center gap-2 whitespace-nowrap"
          >
            <span
              data-measure="__more"
              className="-m-1.5 flex min-h-10 min-w-10 items-center justify-center p-1.5"
            >
              <Menu className="size-4" />
            </span>
            <span data-measure="__navdiv" className="text-border">
              |
            </span>
            {NAV_LINKS.map((link) => (
              <span key={link.href} data-measure={`nav:${link.href}`} className="rounded-md px-2 py-1">
                {link.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* < md: fixed three-item bar, outside the adaptive system */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:hidden">
        <ThemeToggle />
        <BrandSwitcher brand={brand} />
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          // -m-2 offsets the padding so the icon stays put visually while
          // the tap target reaches 44px (was a bare 20px icon).
          className="-m-2 flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile panel: unchanged, everything folds in here including its
          own StreakGoalsBar and ThemeToggle instances (same shared
          stores, stay in sync automatically). */}
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
