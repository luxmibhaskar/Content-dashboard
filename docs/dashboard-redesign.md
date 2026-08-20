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

Applied to every genuine standalone card/panel across the app: KPI
tiles, the Content Calendar grid, list panels (Journey Log, Ideas,
Collaborators, Competitors, Quick Capture, Hook Library groups,
Reference Videos), the Command Center graphs, and every distinct
form/section panel on the topic page (Copy-Ready, Research & Copy,
Scripts, Competitor Benchmarks) including the text-heavy work surfaces
named in the original ask. Deliberately *not* applied to: tiny nested
form-field wrappers and inline edit rows (e.g. a single goal's inline
edit form, the streak-log popover), tab/nav chrome (the pill toggles,
top bar), and modal dialogs (Platforms) — scoped down from "every
bordered box" to "real standalone cards" per an explicit follow-up
decision, since breathing/tilt on button-sized micro-UI reads as jitter
rather than polish. `<details>`-based `CollapsibleSection` gets the same
`.glow-card` CSS class directly (no pointer tracking, a native
disclosure widget's own semantics aren't worth trading for the tilt
effect). Nested content inside an already-glowing panel (e.g. a
Collapsible Section inside a GlowCard) stays plain, to avoid glow-in-
glow visual clutter.

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
