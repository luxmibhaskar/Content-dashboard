
# Command Center Redesign

Redesign of the Dashboard page (`src/app/(app)/page.tsx`, top-bar label
and page heading renamed from "Today", same route and content, see
Layout follow-ups) into a "Command Center" layout, plus an app-wide
visual treatment pass. This is a separate track from `builder-brief.md`'s
own Phase 1/2/3 build phases, see the naming note in `CLAUDE.md` for how
to tell the two apart when either is mentioned as just "Phase N". All
four phases below are built; several Layout follow-ups landed after,
see that section at the end for the current, accurate state of anything
it touches.

## Phase 1 — Command Center layout (built)

Replaces the Pillar Tree (`docs/builder-brief.md` Section 15.1, removed
from Dashboard, its component and action deleted) with a two-column layout:

- **Sidebar** (`src/components/journey-log-widget.tsx`,
  `src/components/content-output-tracker.tsx`): a condensed, most-recent
  view of Journey Log entries, and a Content Output Tracker (published
  counts + format breakdown over Last 30 Days / This Month / This Week).
- **Main area, top**: Quick Access cards
  (`src/components/quick-access-cards.tsx`) replacing the nav links that
  moved out of the crowded top bar (Analytics Overview, Content Calendar,
  Hook Library, Competitors, still one click away, not removed).
- **Top bar**: a new Platforms entry point
  (`src/components/platforms-modal.tsx`) for manually-entered
  follower/subscriber counts. "My Journey Log" and "Collaborators" moved
  into a "More" overflow menu (`src/components/top-bar.tsx`).

Unchanged, explicitly confirmed as correct and not part of this
redesign: the Sunday weekly-review reminder, and the collapsed Services
panel (`docs/builder-brief.md` Section 5.3). Quick Entry
(`src/components/today-quick-entry.tsx`) was unchanged at this point
too, it moved later, see Layout follow-ups.

Format bucketing (`src/lib/content-output.ts`): only formats
unambiguously long-form or short-form roll into those buckets. Post,
Thread, and Story stay in a separate "Other" bucket rather than being
force-fit into Long or Short.

## Phase 2 — Platform data model (built)

**⚠ Partially superseded, see the Platforms/Streak & Goals
consolidation section at the end.** The `platform_snapshots` table
itself and its role feeding the Command Center graphs are accurate
below. The Platforms modal described here is gone, and the table no
longer accepts only 4 fixed platform names, it accepts any.

`platform_snapshots` table (`supabase/migrations/0012_platform_snapshots.sql`):
one row per brand/platform/day, manually entered, for the platforms with
no auto-syncing API (originally Instagram, TikTok, Threads, Facebook;
YouTube stays excluded, its stats already pull live via the YouTube
Data API elsewhere in the app). Timestamped snapshots rather than
a single mutable row, so count-over-time history is preserved for
Phase 3's graphs.

The Platforms modal (`src/components/platforms-modal.tsx`) now reads the
latest snapshot per platform (fetched in `src/app/(app)/layout.tsx`,
pre-fills the form) and writes through
`savePlatformCounts`/`getLatestPlatformCounts`
(`src/app/actions/platforms.ts`). Re-saving the same day upserts that
day's row instead of creating a duplicate.

## Phase 3 — Command Center graphs (built)

Two graphs in the Command Center main area (`src/app/(app)/page.tsx`,
positioning updated by Layout follow-ups below), computed by
`src/lib/audience-growth.ts`:

- **Graph 1, Total Audience Growth**
  (`src/components/charts/audience-growth-chart.tsx`): Tremor
  `AreaChart`, aggregating total followers/subscribers across all
  platforms over time from Phase 2's `platform_snapshots` data. Each
  platform's count carries forward from its own last snapshot between
  entries (manual entry means not every platform gets updated the same
  day).
- **Graph 2, toggleable between three views**
  (`src/components/charts/audience-secondary-chart.tsx`):
  - **Audience Distribution** — Tremor `DonutChart`, each platform's
    latest snapshot.
  - **Growth Velocity** — Tremor `BarChart`, week-over-week change in
    the Graph 1 total, Monday-start weeks (`src/lib/date.ts`'s
    `startOfWeek`).
  - **Output vs Milestone** — dual-axis line/bar
    (`src/components/charts/output-vs-milestone-chart.tsx`), content
    output volume (`src/lib/content-output.ts`'s `publishedDatesOf`)
    against audience growth, same weekly buckets. Tremor 3.18 has no
    dual-y-axis chart, this one view is built directly on Recharts
    (Tremor's own underlying engine, now also a direct dependency in
    `package.json`) instead of through Tremor.

Both graphs flag sparse data plainly instead of rendering a
misleadingly-flat or broken-looking chart: Graph 1 needs at least two
snapshot dates, Growth Velocity needs at least two distinct weeks,
Output vs Milestone needs at least two weeks of either kind of data.
Audience Distribution just shows whatever's been logged, empty is a
valid, clearly-labeled state for it.

## Phase 4 — Full visual treatment (built)

App-wide "AAA-game" visual pass, using each brand's own token colors
(`docs/brand-tokens.md`) instead of generic neon:

- LBsTransformation: Clay Terracotta `#C26D4C`, Deep Teal `#0F766E`,
  Iron Charcoal `#1F2937`.
- LBsWorks: Build Indigo `#4F46E5`, Sell Amber `#F59E0B`, Scale Green
  `#10B981`.

`GlowCard` (`src/components/glow-card.tsx`) is the one shared container
primitive every real card/panel in the app routes through. Extends the
existing light/dark toggle (unchanged, not replaced) with frosted
glassmorphism (`.glow-card` in `src/app/globals.css`: translucent
background, `backdrop-filter: blur`) and a glowing edge in one of the
brand's three `--glow-1`/`--glow-2`/`--glow-3` tokens (also defined
there, per brand, alongside the existing `--primary`/`--ring`
overrides), matching `design-reference/dashboard-reference.jpg`'s
glassmorphism style but re-colored to brand tokens instead of its
generic neon:

- **Idle breathing** — a CSS `@keyframes` animation on `.glow-card`
  itself, no JS needed for the static/idle state.
- **Reactive hover glow** and **parallax 3D tilt** — `GlowCard` owns
  these, both driven by Framer Motion `useMotionValue`/`useSpring` off
  real pointer position, the only two effects that need pointer
  tracking. Both are disabled for `prefers-reduced-motion` users, purely
  by never moving those motion values in the pointer handler (see the
  comment in `glow-card.tsx`: an earlier version used
  `useReducedMotion()` to branch render output, which caused a real
  server/client hydration mismatch, since that hook's first client-side
  value can differ from its SSR value).
- **Touch-tilt reset** (responsive audit follow-up): Pointer Events fire
  for touch as well as mouse, but touch has no mouse-leave equivalent, a
  tap fires one `pointermove` (tilting the card) with no guaranteed
  follow-up event over the card to reset it, so a tapped card could stay
  visibly tilted after the finger lifts. `onPointerUp`/`onPointerCancel`
  in `glow-card.tsx` now reset the tilt back to flat, scoped to
  `e.pointerType === "touch"` only, resetting on every `pointerup` would
  also fire for a mouse click and snap a hovered card flat mid-hover for
  no reason. Code-reviewed and typechecked, not live-verified on a real
  touchscreen: this session's automation browser profile has
  `prefers-reduced-motion: reduce` set (correctly disabling the tilt
  entirely, working as designed) and synthetic `PointerEvent` dispatch
  doesn't reliably reach React's synthetic event system in this
  environment even for the already-working mouse path, so this
  particular fix is worth an actual phone tap to confirm.

Applied to every genuine standalone card/panel across the app: KPI
tiles (each cycling a different `glow` index across a row, same as
every other multi-card list here, so neighboring tiles don't all carry
the identical accent), the Content Calendar grid, list panels (Journey
Log, Ideas, Collaborators, Competitors, Quick Capture), the Command
Center graphs, the topic page's Reference Videos tab (Section 10.2.1;
restored after going silently unwired for a stretch, see topic-page-
redesign.md), and every distinct form/section panel on the topic page
(Research & Copy, Scripts, Competitor Benchmarks, Copy-Ready as of this
note but since removed as redundant, see topic-page-redesign.md)
including the text-heavy work surfaces named in the original ask. Deliberately
*not* applied to: tiny nested form-field wrappers and inline edit rows
(e.g. a single goal's inline edit form, the streak-log popover),
tab/nav chrome (the pill toggles, top bar), and modal dialogs
(Platforms) — scoped down from "every bordered box" to "real standalone
cards" per an explicit follow-up decision, since breathing/tilt on
button-sized micro-UI reads as jitter rather than polish. (The top bar
was later given the *static* half of the treatment only — a real
surface fill and shadow separation, no breathing or tilt — see "Shared
filter-bar patterns" at the end of this doc.) `<details>`-
based `CollapsibleSection` gets the same `.glow-card` CSS class directly
(no pointer tracking, a native disclosure widget's own semantics aren't
worth trading for the tilt effect). Nested content inside an
already-glowing panel (e.g. a card inside a CollapsibleSection, or a
CollapsibleSection inside a GlowCard) stays plain, to avoid glow-in-glow
visual clutter — this is why Hook Library's two list types (the
Delivery-Mode entries and the Live Variant Aggregation groups) are both
plain `rounded-lg border` divs rather than GlowCards: both live inside a
`CollapsibleSection`, which is already the glowing surface.

## Layout follow-ups (built)

A series of precise layout corrections after the four phases above, in
order:

- **Quick Entry moved into the Journey Log sidebar card**
  (`src/components/today-quick-entry.tsx` gained an `embedded` prop,
  rendered from `src/components/journey-log-widget.tsx`), no longer its
  own centered block in the main column. Within that card the writing
  box stays fixed at the top; the entry list below it is its own
  independently scrolling region, contained within the card's own fixed
  height, never pushing the writing box out of view. This exposed a real
  bug in `GlowCard`: its inner content wrapper had no height of its own,
  so a child relying on `h-full` (this fixed-top/scrollable-list split,
  and the sidebar's two cards being equal height) had nothing to
  actually fill. Fixed with an opt-in `fill` prop on `GlowCard`
  (`flex h-full flex-col` on the wrapper when set), enabled on both
  sidebar cards. Confirmed via grep this is the only place in the app
  that relies on this fixed-height/internal-scroll pattern.
- **Command Center graphs, placement and grouping**: moved from the
  bottom of the page to directly below the Quick Access cards, then
  merged from two separate cards into one shared `GlowCard` (two
  sections side by side inside it, a border between them). Total
  Audience Growth is always visible on one side; the Audience & Output
  toggle sits on the other, switching between its three views as
  before. Exactly two graphs are ever visible at once: Total Audience
  Growth plus whichever toggle view is selected. The Content Output
  Tracker's own donut chart was never part of this, it stays in the
  sidebar.
- **Command Center graphs, resizable split**
  (`src/components/audience-graphs-panel.tsx`, a new client component
  that now owns rendering both graph sections and the `GlowCard`
  wrapping them, extracted out of `page.tsx`): a draggable handle on the
  border between the two sections adjusts their relative width (desktop
  only, `md:` and up, the two stack full-width on mobile with no
  handle). Persists across visits the same way the dark/light theme does
  (`src/components/theme-toggle.tsx`): a `localStorage`-backed
  `useSyncExternalStore`, not `useState` + `useEffect`, since this
  codebase's `react-hooks/set-state-in-effect` lint rule blocks setting
  state synchronously on mount, and `useSyncExternalStore`'s
  `getServerSnapshot` handles the SSR/hydration split correctly without
  it. Defaults to an even 50/50 split when nothing's stored, clamped to
  20–80% either way so neither side can be dragged down to nothing.
  Keyboard-operable too (arrow keys nudge it, Home/End jump to the
  clamp bounds), verified alongside the drag gesture and the
  reload-persists behavior.
- **Dashboard heading beside streak/goal**: the heading, the Sunday
  weekly-review callout, and the next-up-suggestion paragraph now sit in
  a column beside (not stacked above) the streak strip and goal area, a
  two-column row.
- **Renamed "Today" to "Dashboard"**: top-bar label
  (`src/components/top-bar.tsx`) and the page's own `<h1>`
  (`src/app/(app)/page.tsx`). Same route (`/`) and content, label only,
  every other file referencing "the Today page" in a comment was updated
  to "Dashboard" too for consistency; literal calendar-day usages of the
  word ("today's snapshot", the Analytics range filter's "Today" option,
  streak-log "Walked today?") are unrelated and untouched. Component and
  action names (`TodayPage`, `TodayQuickEntry`, `logTodayStreak`,
  `todayDateKey`) stay as-is, an internal identifier rename wasn't part
  of this ask and would be disproportionate for a label-only change.
  `docs/builder-brief.md`'s own "Section 5. Today View" heading and
  changelog prose are intentionally untouched too, that document is the
  original historical spec, already established as superseded piecemeal
  by newer docs (this one included) rather than edited in place.
- **Platforms moved into the "More" overflow menu**
  (`src/components/top-bar.tsx`), alongside My Journey Log and
  Collaborators, off the main row. `PlatformsModal` gained a
  `triggerClassName` prop so its trigger can be restyled per placement
  (top-bar row vs. dropdown-menu-item look) without duplicating the
  Dialog itself. Rendered directly inside `DropdownMenu.Content` rather
  than through a `DropdownMenu.Item`, since it opens a separate Dialog
  rather than navigating and `asChild` would merge the Item's trigger
  props onto `Dialog.Root`, which doesn't forward them anywhere
  meaningful.
- **LBsWorks background wash matches LBsTransformation's effect type**
  (`src/app/globals.css`, both brands' `html[data-brand="..."] body`
  rules): LBsWorks previously had a dot-grid pattern instead of a
  gradient wash, the original spec's "either/or" wording for the two
  brands' backgrounds, an inconsistency beyond just color. Both now use
  the identical light-from-above radial-gradient shape/position/falloff,
  only the tint differs, LBsTransformation keeps its existing near-white
  Mist tone, LBsWorks now uses a low-strength mix of Build Indigo (`#4F46E5`,
  its existing `--primary`). The mix percentage isn't the same number for
  both (Indigo needs a much lower percentage than Mist to read equally
  faint, Mist is already near-white so a high mix barely shifts the page,
  the same percentage of a saturated color would not), calibrated in the
  browser at both a subjective "barely noticeable" bar, side by side, so
  LBsWorks doesn't read more prominent for being newly built.

## Streak & Goals redesign (built)

**⚠ Partially superseded, see the Platforms/Streak & Goals
consolidation section at the end.** The data model here (per-platform
goals, plain-count progress, Simple Icons) is accurate. The dedicated
`/streaks-goals` page and the top-bar shuffle display's `current_value`
auto-pull logic described below are gone/changed, superseded by the
pop-out modal and a single-source-of-truth rewrite.

**Requires running `supabase/migrations/0013_platform_goals.sql`
manually before goal creation/editing works** (no CLI wired up here,
same as every prior migration, see the SQL editor instructions this
shipped with). Reads degrade gracefully without it (an unmigrated
`goals` table just shows "no goals yet"), but `addGoal`/`updateGoal`
throw a real error until it's applied, verified directly in the browser
during this build.

Three related changes, treated as one connected piece:

- **"Dashboard · Brand" heading and the next-up-suggestion placeholder
  are gone entirely** (`src/app/(app)/page.tsx`), not relocated. The
  weekly-review Sunday callout and the backup-failure warning that used
  to sit alongside them stayed, now as plain full-width blocks (the
  two-column "heading beside streak/goal" row from the previous layout
  follow-up doesn't exist anymore either, streak/goal left this page).
- **Streak/goals moved into the top bar**
  (`src/components/streak-goals-bar.tsx`, rendered from
  `src/components/top-bar.tsx` directly below the brand-switcher row):
  compact, centered, always expanded, never collapsible (confirmed).
  Walk/posting streak counts show plainly; with 2+ platform goals it
  shuffles through them one at a time, ~4s each (confirmed), a plain
  `setInterval` + `useState`, not the `useSyncExternalStore` pattern
  used elsewhere in this app, that pattern is for syncing an external
  store on mount/change, this is a genuinely time-driven animation, a
  different problem. Display only, no editing, no expand/collapse
  interaction.
- **New `/streaks-goals` page** ("Streak and Goals" in the "More" menu,
  `src/app/(app)/streaks-goals/page.tsx`) holds all the actual editing:
  a "Log today" form (`src/components/streak-goals/streak-log-form.tsx`)
  and a "Log a past day" toggle exposing a real date input for
  backfilling a forgotten day, both hitting the same
  `logStreakEntry` action (`src/app/actions/streaks.ts`, generalized
  from the old `logTodayStreak`, which hardcoded today's date; the
  `daily_streaks` schema and `computeStreak()` already supported an
  arbitrary `streak_date`, that hardcoded action was the only real gap).
  Goal add/edit reuses the exact CRUD interaction the old
  GoalProgressStrip already had (`src/components/streak-goals/platform-goal-card.tsx`,
  `add-platform-goal-form.tsx`), just relocated, not a new pattern
  (confirmed). `StreakStrip` and `GoalProgressStrip` (the old
  always-quiet-strip components) are deleted, superseded by the top-bar
  display plus this page.

**Goals are per-platform now**, not the old fixed `target_metric` list
(`Subscribers/Followers | Views | Revenue | Community Members |
Custom`): any platform, a freeform name, plus an icon
(`supabase/migrations/0013_platform_goals.sql` adds `platform_name`,
`icon_slug`, `icon_url` to `goals`; `target_metric`/`goal_text` stay in
the schema for old rows, superseded, no UI reads or writes them
directly anymore, `goal_text` just mirrors `platform_name` on
save/update to satisfy its existing not-null constraint). Progress
displays as a plain count, "3,747/10,000 reached"
(`src/components/streak-goals/platform-goal-card.tsx`'s
`progressLabel`), not a percentage or bar.

- **Icon source**: "pick from a set" only for now, real upload deferred
  (`icon_url` sits unused in the schema, ready for it later without
  another migration). The set is Simple Icons
  (`react-icons/si`, a new dependency), not this app's usual Lucide,
  per explicit direction, real brand logos read better for "which
  platform is this" than a generic icon set would, Lucide stays the
  system everywhere else. Curated to ~26 creator-relevant platforms in
  `src/lib/platform-icons.ts`; LinkedIn isn't in the set, Simple Icons
  itself doesn't ship it (verified against the installed package, not
  an oversight here). `PlatformIconPicker`
  (`src/components/streak-goals/platform-icon-picker.tsx`) is a Radix
  Popover grid writing the chosen slug into a hidden form field.
- **Current-value auto-pull, generalized** (`src/lib/goals.ts`):
  the old Views-only special case (pulled from Analytics'
  summed `content_calendar.views`) now applies to any goal named
  exactly "views" (case-insensitive), plus a new case, a goal whose
  platform name exactly matches one of `src/lib/platforms.ts`'s
  `PLATFORMS` (Instagram/TikTok/Threads/Facebook) pulls from that
  platform's latest `platform_snapshots` row instead of asking for the
  same number twice. Both cases store `current_value` as `null` and
  resolve it live at render time
  (`resolveGoalCurrentValues`, called from both `layout.tsx` for the
  top-bar display and the `/streaks-goals` page); anything else is a
  genuinely custom platform, `current_value` stays manual entry, and
  its input field is only ever disabled on the two auto-pull cases.

**A real lint pattern worth remembering**: rendering one of several
possible icon components picked by a runtime lookup
(`const Icon = lookupFn(x); <Icon />`) trips this project's
`react-hooks/static-components` rule, "component created during
render", even though the returned component is always one of a small,
stable, statically-imported set. The fix isn't `useMemo`, wrapping the
same `<Icon />` JSX in a memo callback still trips it, the callback
still runs during render. What actually avoids it: never bind the
component reference to its own bare identifier, keep it as a property
access instead, `<match.Icon />` off the found object (or destructure
it inline in a `.map()` callback's parameters, which the same rule
already allowed elsewhere in this app, e.g.
`src/components/quick-access-cards.tsx`). Applied in
`streak-goals-bar.tsx`, `platform-goal-card.tsx`, and
`platform-icon-picker.tsx`; `src/lib/platform-icons.ts`'s
`findPlatformIcon` returns the whole matched entry rather than just its
`Icon` for exactly this reason.

## Platforms/Streak & Goals consolidation (built)

**Requires running
`supabase/migrations/0014_platform_snapshots_any_platform.sql`
manually** (drops `platform_snapshots`' old 4-platform CHECK
constraint). Verified directly in the browser: before this ran, saving
a goal's current count for a platform name that didn't exactly match
the old 4 (case-sensitive) failed; after, it wrote cleanly and the
Audience Distribution graph's total updated in the same page load,
confirming the shared table end-to-end, not just by reading the code.

One connected set of changes, triggered by a real question: does
`goals.current_value` and `platform_snapshots` ever disagree? They did,
partially. The old auto-pull only reconciled two cases (a goal named
"views", or matching one of 4 fixed platform names); any other
platform name (which "any platform, freeform" already allowed) got a
`current_value` with no connection to `platform_snapshots` at all, two
numbers that could drift apart with nothing keeping them in sync.
Resolved by making `platform_snapshots` the single source of truth for
every platform goal's current count, not just those 4:

- **Platforms modal removed entirely**
  (`src/components/platforms-modal.tsx`, `src/lib/platforms.ts` both
  deleted). Its 4-platform bulk form is gone; current-count entry moved
  into each platform goal's own edit form instead, one platform at a
  time. `src/lib/types.ts`'s own separate, differently-scoped
  `PLATFORMS` constant (autocomplete suggestions on Collaborators/
  Competitors platform fields, unrelated to audience tracking) is
  untouched.
- **The dedicated `/streaks-goals` page is gone**, replaced entirely by
  a pop-out modal (`src/components/streak-goals-modal.tsx`), opened
  from the exact spot Platforms used to occupy: the "More" menu (both
  desktop and mobile) and the top-bar shuffle display's empty-state
  prompt. Fully externally controlled (`open`/`onOpenChange`, no
  `Dialog.Trigger` of its own), since it needs to open from more than
  one place, the open state lives in `TopBar` and gets passed down.
  Two tabs inside, "Log Streak" (today + backfill, unchanged) and
  "Goals" (full CRUD), not one long flat scroll, this genuinely didn't
  fit as a single continuous form.
- **Current and target sit side by side on every goal card**
  (`src/components/streak-goals/platform-goal-card.tsx` and
  `add-platform-goal-form.tsx`), both editable for any platform name
  now. Only "views" stays disabled (that number comes from Analytics,
  not something to snapshot). Submitting a current value writes a
  `platform_snapshots` row (`maybeLogCurrentValue` in
  `src/app/actions/goals.ts`, calling the new
  `logPlatformSnapshot` in `src/app/actions/platforms.ts`, an upsert on
  `(brand, platform, snapshot_date)`, same as the old modal's write).
  `goals.current_value` itself is never written for a platform goal
  anymore, for any platform, not just the previously-special 4, it
  stays in the schema for old rows only, fully superseded.
  `src/lib/goals.ts`'s `resolveGoalCurrentValues` always resolves live:
  "views" from Analytics, everything else from
  `getLatestPlatformSnapshots` (renamed from `getLatestPlatformCounts`,
  now `Record<string, number>` keyed by whatever platform names exist
  for the brand, not a fixed union type).
- **Confirmed single source of truth everywhere platform numbers
  show**: the top-bar shuffle display, and all four Command Center
  graphs (Total Audience Growth, Audience Distribution, Growth
  Velocity, Output vs Milestone, `src/lib/audience-growth.ts`) already
  read `platform_snapshots` with `platform` typed as plain `string`,
  not the old fixed union, so they needed no changes at all to support
  arbitrary platform names, they were already general. Only the write
  side (the removed modal, now the goal card) and the CHECK constraint
  were actually scoped to 4 platforms.
- **"Log a past count"**, same spirit as the streak backfill: a real
  date input on each platform goal's card
  (`platform-goal-card.tsx`, hidden for Views), seeding real history for
  a platform that's only just being added to the dashboard rather than
  only ever accumulating forward from today. `logPastPlatformSnapshot`
  in `src/app/actions/platforms.ts` shares its actual upsert with the
  current-count path (`upsertSnapshot`), just with a caller-supplied
  `snapshot_date` instead of always today. Verified directly in the
  browser: backfilling one past date for a platform with no prior
  history took Total Audience Growth from its "not enough history"
  placeholder to an actual two-point line.
- **Full graph-wiring audit** (Total Audience Growth, Audience
  Distribution, Growth Velocity, Output vs Milestone, and the sidebar's
  Content Output Tracker): confirmed live, not just at the code level,
  that each reads from the table/fields it's supposed to
  (`platform_snapshots` for the four audience graphs,
  `content_calendar`'s `production_status`/`publish_date`/`format` for
  Output vs Milestone and Content Output Tracker) and updates correctly
  when that underlying data changes. One real finding: a calendar item
  can carry `production_status = "Published / Scheduled"` with an empty
  `publish_date`, which `isPublished` (`src/lib/content-output.ts`)
  correctly excludes from both Content Output Tracker and Output vs
  Milestone, but nothing in the calendar UI flags this combination, so
  it silently reads as zero output for that item. Worth a UI warning
  later; not built now, out of scope for this follow-up.
- **Top-bar visibility toggles**: three independent checkboxes in the
  Streak & Goals modal, one each for Walk streak, Posting streak, and
  the rotating platform-goal shuffle (icon, name, progress) in
  `streak-goals-bar.tsx`. Each controls only its own element, hiding one
  never affects the others. localStorage-backed `useSyncExternalStore`
  via a small shared factory (`src/lib/shuffle-visibility.ts`,
  `createVisibilityToggle`, one instance per element, its own storage
  key and listener set), same pattern as the theme toggle and the
  audience-graphs split, a visibility preference only, no data changes.
  Verified live: unchecking just Walk streak removes only that element
  from the top bar, Posting streak and the platform shuffle stay put;
  the default (no stored preference) is visible for all three.
- **Top-bar row consolidation**: the streak/goals display
  (`streak-goals-bar.tsx`) is no longer its own bordered row below the
  brand switcher, it renders inline now on the left side of the main
  top-bar row (`top-bar.tsx`). The nav links (Dashboard, Idea Panel,
  Review) and the More dropdown moved out of that row's left side into
  its right side, between the day/night toggle and Sign out, with `|`
  dividers between each so they read as distinct items. One row below
  the brand switcher now instead of two, `justify-between` puts
  streak/goals on the left and toggle+nav+email+Sign out on the right.
  The More dropdown's `align` changed from `start` to `end` to match its
  new position on the right edge. Mobile behavior (nav hidden below
  `md`, replaced by the existing hamburger menu) is unchanged, only the
  desktop-width positioning moved. Verified live: single row, `Walk
  streak: N · Posting streak: N · <platform shuffle>` on the left,
  `☀ Dashboard | Idea Panel | Review | More  email  Sign out` on the
  right, the More dropdown still opens fully on-screen, and Streak and
  Goals still opens the modal correctly from its new position.
- **System & Services restructuring**: "Check Alternatives" (the
  per-service check button and stored verdict, backed by
  `service_alternative_checks` and the `checkAlternatives` action) is
  removed from the UI entirely, not hidden, per explicit instruction.
  "Swap alternatives" (static reference text from `SERVICES`) stays,
  that's a different, unrelated column. Live Status and Backup moved out
  of System & Services into their own new collapsible container ("Live
  Status & Backup"), positioned directly below it, both together in that
  one container rather than two. `src/components/services-panel.tsx` now
  renders two sibling `CollapsibleSection`s instead of one. Verified
  live: System & Services' table has no Check Alternatives column left;
  the new container expands to show Live Status (still fetching real
  usage numbers on demand) and Backup together.
- **Email removed next to Sign out, top bar rebuilt as real progressive
  disclosure instead of a single row that wrapped**: an earlier
  instruction to remove the `userEmail` display had never actually
  reached this component (confirmed by reading the live code, not
  memory, before touching anything: it was still there, unchanged,
  every prior top-bar turn this session left it alone). Removed now,
  `TopBar` no longer takes a `userEmail` prop at all, and
  `src/app/(app)/layout.tsx` no longer passes one (the `user` fetch
  itself stays, still needed for the auth-guard redirect).
  Separately, the single `flex items-center justify-between` row
  (brand switcher's row aside) that held the streak/goals shuffle on
  the left and toggle+nav+Sign out on the right had no responsive
  strategy of its own beyond `hidden md:flex`/`md:hidden`, so it wrapped
  onto a second line once that combined content didn't fit, rather than
  degrading gracefully. Rebuilt as genuine 3-tier progressive
  disclosure, never wrapping at any width:
  - **Desktop (`lg:` and up)**: everything inline, streak/goals shuffle
    on the left, theme toggle + nav links with `|` dividers + a small
    `MoreMenu` (My Journey Log/Collaborators/Streak and Goals) + Sign
    out on the right.
  - **Tablet (`md`-`lg`)**: the nav links row folds into the same
    `MoreMenu` component (now given `[...NAV_LINKS, ...MORE_LINKS]`
    instead of just `MORE_LINKS`), one unified dropdown instead of a
    row that no longer fits. Streak/goals shuffle, theme toggle, and
    Sign out stay inline.
  - **Mobile (below `md`)**: everything folds behind the hamburger,
    including the streak/goals shuffle and the theme toggle this time
    (previously only nav did), only the brand switcher row and the
    hamburger itself stay visible in the header. The expandable panel
    gets its own `StreakGoalsBar` and `ThemeToggle` instances (same
    underlying shared stores, both stay in sync automatically) rather
    than trying to relocate the desktop ones via CSS.
  `MoreMenu` is one shared component taking a `links` prop, reused for
  both the desktop and tablet dropdowns rather than two hand-duplicated
  ones. Verified live (this session's `resize_window` limitation still
  applies, true viewport-width screenshots aren't reliable here, so
  verification is via a mix of live interaction at the actual desktop
  width plus direct DOM/class inspection for the other two tiers):
  desktop renders on one line with the email gone and the correct
  3-item More dropdown; the tablet `MoreMenu` instance carries the
  correct merged `lg:hidden` wrapper class and the exact
  `[...NAV_LINKS, ...MORE_LINKS]` props (confirmed via source, a
  `display:none` Radix trigger can't be force-opened to visually
  re-confirm its content, this is a known limitation of the trigger
  itself, not something specific to this build); forcing `mobileOpen`
  true at desktop width confirmed the mobile panel actually contains
  the streak/goals shuffle, all 5 nav+more links, the Streak and Goals
  trigger, its own independent theme toggle, and Sign out, all together.
- **YouTube subscriber count auto-refresh (Group J)**: a YouTube
  platform goal can pull its own current subscriber count from the Data
  API instead of only ever being typed in.
  - **`goals.source_ref`** (migration `0024_goals_source_ref.sql`),
    nullable, holds the external identity the API needs, a YouTube
    channel id or `@handle`. Optional field on the YouTube platform-goal
    card, and on the add-form once the typed name looks like YouTube.
    `updateGoal` only writes it when the field was in the submit, so
    editing a non-YouTube card never blanks it.
  - **`fetchYouTubeChannelStats`** (`src/lib/youtube.ts`) resolves a
    channel id / `@handle` to a live subscriber count.
    **`refreshYouTubeSnapshot`** (`src/app/actions/platforms.ts`)
    upserts that into today's `platform_snapshots` row, the same row a
    manual save writes, so last-write-today wins with no extra column or
    merge logic. A **"Refresh from YouTube"** button
    (`src/components/streak-goals/youtube-refresh-button.tsx`) on the
    Platforms view triggers it and shows the result or error inline,
    leaving the prior number intact on failure.
  - **Nightly:** `refreshYouTubeSnapshotsAllBrands`
    (`src/lib/youtube-sync.ts`) walks both brands and, for each one
    whose YouTube goal has a `source_ref` and no `platform_snapshots`
    row dated today, pulls and upserts. Idempotent (a manual save or
    button press for today wins and is left alone) and non-fatal
    (per-brand errors collected, whole-call failure caught), and it runs
    on the backup cron's first-brand invocation so it never disrupts the
    backup it rides alongside. (Group I's per-video stats refresh is
    button-only, no nightly equivalent, see
    `docs/platform-performance-tracking.md` Section 9.)
- **Top bar rebuilt as one adaptive bar with runtime overflow
  collapsing**: the brand-switcher row and the main row are merged into a
  single bar at `md` and up, the 3-tier `md`/`lg` breakpoint scheme
  (desktop inline / tablet folds nav into MoreMenu / mobile hamburger) is
  gone. The bar now measures its own width at runtime and moves items
  into the one MoreMenu one at a time as it narrows, expanding them back
  in reverse as it widens, rather than switching layouts at two fixed
  breakpoints.
  - **Grid, not a flex sequence**: the `md:` bar is a
    `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` row. Left column holds
    the "Streak and Goals" toggle and its collapsible streak row (see the
    separate "Streak items" entry below), the centre `auto` column holds
    BrandSwitcher only, the right column holds ThemeToggle + nav links +
    MoreMenu trigger + Sign out. Because both side tracks are equal
    fractions, BrandSwitcher stays optically centred in the bar no matter
    how full either side is. BrandSwitcher is no longer centred in its own
    separate strip, it is the centre grid cell of the single row.
  - **Width measurement**: a hand-written `ResizeObserver`
    (`src/lib/use-element-size.ts`: `useElementWidth` for a column's
    width, `useMeasuredWidths` for per-item natural widths off an
    offscreen `visibility:hidden` rig). No resize library: a generic
    priority-nav list doesn't model this (nav links prepend into a
    dropdown, the streak row hides items behind a badge - see below), and
    a resize lib would only cover the measurement third of the job. The
    observer callbacks match the codebase's existing
    `useSyncExternalStore` pattern (theme toggle, `shuffle-visibility`)
    and keep every `setState` off the effect body, clear of the repo's
    `react-hooks/set-state-in-effect` and `react-hooks/refs` rules.
  - **Nav-link collapse priority** (first to go listed first): Review,
    Idea Panel, Dashboard, measured against what's left of the right
    column after ThemeToggle, the MoreMenu trigger and Sign out (which
    never collapse) are reserved. BrandSwitcher, ThemeToggle, Sign out
    and the MoreMenu trigger are never collapsed. (The left-column streak
    row's own priority is covered in the "Streak items" entry below.)
  - **No hysteresis needed**: `computeOverflowCollapse`
    (`src/lib/overflow-collapse.ts`) is a plain stateless function of
    (budget, ordered item widths, gap). The usual priority-nav flicker
    comes from a measure -> mutate -> re-measure loop; here the side
    tracks are fixed fractions and the measuring rig always renders every
    item, so collapsing or expanding never changes a measured value and
    nothing feeds back.
  - **One MoreMenu, predictable order**: collapsed nav links sit at the
    top of the existing MoreMenu, above the static links (My Journey
    Log / Topic Map / Collaborators) and the Streak and Goals button,
    ordered so the most recently collapsed link is highest. They stay
    real `<Link>`s. The trigger still lights with `.nav-link-active` when
    the current page's nav link has collapsed into it. `MoreMenu` gained
    a `prependItems` prop for this; its old `[...NAV_LINKS, ...MORE_LINKS]`
    tablet-tier call site is gone. (Streak items never go into the
    MoreMenu - the left column caps its own row, see below.)
  - **The three visibility toggles are untouched**: `walkStreakVisible` /
    `postStreakVisible` / `shuffleVisible` (`src/lib/shuffle-visibility.ts`)
    still gate whether each streak item exists at all. The streak
    rendering, the ~4s shuffle rotation and those three
    `useSyncExternalStore` reads moved from `StreakGoalsBar` into a new
    `useStreakItems` hook (`src/lib/use-streak-items.tsx`) so the bar can
    place each item individually. `StreakGoalsBar` itself is unchanged
    and still rendered as-is by the mobile panel.
  - **Below `md`**: a fixed three-item bar, ThemeToggle on the left,
    BrandSwitcher centred, the same hamburger on the right, outside the
    adaptive system entirely. The hamburger still opens the existing
    mobile panel (its own `StreakGoalsBar` + `ThemeToggle` instances, all
    nav + more links, Streak and Goals, Sign out), unchanged.
  - Verified live at the actual desktop width plus DOM/class inspection
    for narrower widths (this session's `resize_window` limitation still
    applies, true viewport-width screenshots aren't reliable here):
    the `md:` bar renders as one row with BrandSwitcher centred; forcing
    the right column narrower confirmed Review, then Idea Panel, then
    Dashboard move into the MoreMenu (newest on top, above the static
    links) and return in reverse as it widens; `mobileOpen` forced true
    at desktop width still shows the full mobile panel.
- **Streak items: manual toggle instead of automatic collapse**: the
  three streak/goals items (walk streak, posting streak, platform
  shuffle) were pulled out of the left column's width-based collapse. The
  right column's nav-link auto-collapse into MoreMenu is unchanged, only
  the left side changed. In their place, at `md` and up, a single "Streak
  and Goals" toggle button sits at the very left edge of the left grid
  column; when it's on the visible items render inline to its right (each
  still gated by its own `walkStreakVisible` / `postStreakVisible` /
  `shuffleVisible` flag). The toggle is manual; the items themselves are
  width-driven (see "One-line cap" below). BrandSwitcher stays centred
  because the 3-column grid is untouched.
  - **Breakpoint-dependent default**: on at `lg` and up, off at
    `md`-`lg`. State is `streakManual: boolean | null`
    (`src/components/top-bar.tsx`) read against two `useMediaQuery`
    breakpoints (`src/lib/use-media-query.ts`, `matchMedia` via
    `useSyncExternalStore`, server snapshot assumes desktop). While
    `null` the effective state follows the live breakpoint default, so a
    resize across `lg` re-applies that side's default; the first click on
    the toggle freezes it to a fixed boolean that no longer tracks the
    breakpoint for the rest of the session, so a deliberate choice is
    never discarded by a later resize.
  - **Below `md`**: the toggle is not rendered; streak items stay
    reachable only through the hamburger and the mobile panel's own
    untouched `StreakGoalsBar`, exactly as before.
  - **All items hidden**: if `walkStreakVisible` / `postStreakVisible` /
    `shuffleVisible` are all false (every item turned off in the Streak
    and Goals modal, `StreakGoalsModal`, opened from the MoreMenu), the
    toggle button itself is removed from the bar, not just its contents,
    so the left column renders nothing at `md`+. Gated on
    `anyStreakVisible = visibleStreakItems.length > 0`; live via the same
    `useSyncExternalStore` reads, so re-enabling one item in the modal
    brings the toggle straight back with no refresh, falling back to
    whatever `streakManual` / breakpoint state it already had.
  - **One-line cap (priority overflow collapse + "+N" badge)**: the open
    row is `flex-nowrap` + `overflow-hidden`, so it can never wrap. As the
    left `1fr` column narrows, visible items are hidden in priority order
    - **walk streak first, then posting streak, then the platform shuffle
    (shuffle survives longest)** - and a small non-interactive `+N` badge
    (N = count hidden) appears in the row. The toggle button never
    collapses. This reuses `computeOverflowCollapse` (`overflow-collapse.ts`)
    and `useElementWidth` / `useMeasuredWidths` (`use-element-size.ts`)
    unchanged, the same machinery as the right column's nav collapse, with
    a `leftColRef` + offscreen measuring rig re-added to the left column.
    `N` updates live on width change; it does **not** flicker on the ~4s
    shuffle rotation.
  - **Shuffle item's variable width**: the shuffle text rotates every ~4s
    and each goal is a different width (~140px for the empty-state prompt,
    ~170px+ for "Tiktok 80/123 reached"). Rather than re-measure on every
    tick, `useStreakItems` exposes `shuffleVariants` - one node per
    candidate goal (or the empty-state) - all rendered in the rig, and the
    collapse maths reserves the **max** measured width. The decision is
    then rotation-independent: the visible goal swaps inside an
    already-reserved slot, so no recompute, no badge flip, no one-frame
    overflow. Recompute triggers only on a real column-width change
    (`ResizeObserver`) or when `streak.measureSignature` changes (goal
    set, `current_value` / `target_value`, `platform_name`, brand, streak
    counts, visibility flags). Font load is handled inside
    `useMeasuredWidths`. Walk / posting streak widths are treated as
    stable (server-provided counts, no client timer); their values are in
    `measureSignature` so a digit-count change re-measures, nothing more.
  - **Badge slot always reserved**: while the toggle is open the budget
    subtracts the measured badge width unconditionally, so hiding an item
    can't free space that adding the badge then re-consumes (no
    oscillation at the boundary). Costs ~28px of headroom at wide widths
    where everything fits anyway.
  - **Walk-streak label shortening** (`src/lib/streaks.ts`): "Walk/Workout
    streak" -> "Walk streak", "Work/Innovation streak" -> "Work streak"
    (`name` keeps the fuller wording for CSV headers / form titles). Done
    to raise the width at which the shuffle item is the only thing left
    before the row bottoms out; the one-line cap above is what actually
    guarantees no wrap at any width.
  - `useStreakItems` (`src/lib/use-streak-items.tsx`) returns
    `{ items, shuffleVariants, measureSignature }` (was a bare
    `StreakItem[]`). `DROPDOWN_ITEM_CLASSNAME` lives in `top-bar.tsx`.

## Analytics Platforms view (built)

A `?view=platforms` toggle at the top of the Analytics page
(`src/app/(app)/analytics/page.tsx`), the `Platforms` half of the
`Content | Platforms` `SegmentedToggle` (see "Shared filter-bar
patterns" below). It renders the same platform-goal list as the Streak
& Goals modal: reuses `PlatformGoalCard` and `AddPlatformGoalForm`, and
reads the same `goals` + `platform_snapshots` data through
`resolveGoalCurrentValues`, the exact path `layout.tsx` feeds the top
bar. Not a copy: an edit made in either place shows in the other. The
content filter bar (date range / Format / Platform) hides in this view
since none of it applies, and this view deliberately ignores
`src/lib/shuffle-visibility.ts` so every tracked platform always shows
here, not just the ones enabled for the top-bar shuffle. The `content`
view (every KPI and chart) is unchanged and stays the default.

## Shared filter-bar patterns (built)

A pass over the two busiest filter bars in the app (Content Calendar,
Analytics), plus the top bar's light-mode edge, sharing two new small
components.

### `SegmentedToggle` (`src/components/segmented-toggle.tsx`)

The bordered "pick one" control that Analytics' Content vs Platforms
view toggle already drew inline, extracted so it's one component. A
`role="group"` container (`inline-flex rounded-lg border border-border
p-0.5`) with the selected option filled (`bg-primary
text-primary-foreground`) and the rest transparent. Plain server
component — every option carries a precomputed `href`, the caller owns
building those (and preserving whatever other query params it wants).
Used by Analytics' view toggle and Content Calendar's Long Form / Short
Form.

### `FilterMenu` (`src/components/filter-menu.tsx`)

A compact dropdown "select" for filters that are read more often than
they're changed. Same construction as the top bar's `MoreMenu`: Radix
`DropdownMenu` with `<Link>` items via `asChild` (navigation stays real
hrefs, server keeps computing them; only open/close is client JS), menu
surface reuses `.nav-dropdown-content`. The trigger shows
`label: value` and lights with `.nav-link-active` when `active` is set,
so an applied filter is still visible while the menu is closed. `"use
client"` — it's the one piece here that needs it.

### Content Calendar filter bar

Was two stacked pill rows: Long Form / Short Form, then Week / Month /
Custom plus a `from to to` text. Now one `justify-between` row —
`[Long Form | Short Form]` (`SegmentedToggle`) on the left, `[Range: …]`
(`FilterMenu`) on the right — with the `from to to` text on a small
muted line beneath, and `CustomRangeForm` still opening below when
Custom is picked. `buildHref` now also carries `from`/`to` through a
Long ↔ Short switch, so a picked custom range is no longer silently
dropped when the format changes (the old hardcoded `?type=X&range=Y`
hrefs did that). The old `TypeLink` / `RangeLink` helpers are gone.

### Analytics filter bar

Was four stacked rows: view toggle, date range (6 options), format (3),
platform (~7). Now two: the `SegmentedToggle` view toggle, then a
single bar with the date range still as visible pills (the
most-frequently-changed control) followed by `FilterMenu` dropdowns for
Format and Platform after a thin divider. `buildHref`, the KPI grid,
and every chart are untouched — the dropdowns feed the same query
params the pills did, and the filters still deliberately don't touch
Current Streak / Streak History.

### Top bar surface (light mode)

The top bar's only separation from the page was `border-b
border-border`, and `--border` (`oklch(0.922 0 0)`) is nearly invisible
against a near-white page. New `.top-bar` class (`src/app/globals.css`,
applied to the `<header>` in `src/components/top-bar.tsx` in place of
the border utilities) gives it the *static* half of the card
treatment: a blurred `--popover` fill so content sits on a raised
surface, plus a downward `--glow-1` shadow (the same always-on accent
`.brand-switcher` / `.nav-link-active` use) reading as the bar floating
above the page. No `GlowCard`, no breathing or pointer tilt — the top
bar stays off that, consistent with Phase 4's "not applied to … top
bar" call. Dark mode keeps the treatment but lighter (fainter fill,
neutral drop, no colored halo), matching the `.dark .glow-card`
reasoning that its visible border is cue enough there. Internal
dividers (the brand-switcher strip, the mobile panel) stay plain
hairlines.
