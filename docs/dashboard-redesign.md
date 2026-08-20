# Command Center Redesign

Redesign of the Today page (`src/app/(app)/page.tsx`) into a "Command
Center" layout, plus an app-wide visual treatment pass. This is a
separate track from `builder-brief.md`'s own Phase 1/2/3 build phases,
see the naming note in `CLAUDE.md` for how to tell the two apart when
either is mentioned as just "Phase N". All four phases below are built.

## Phase 1 — Command Center layout (built)

Replaces the Pillar Tree (`docs/builder-brief.md` Section 15.1, removed
from Today, its component and action deleted) with a two-column layout:

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

Unchanged, explicitly confirmed as correct and not part of this redesign:
Quick Entry (`src/components/today-quick-entry.tsx`), the Sunday
weekly-review reminder, and the collapsed Services panel
(`docs/builder-brief.md` Section 5.3).

Format bucketing (`src/lib/content-output.ts`): only formats
unambiguously long-form or short-form roll into those buckets. Post,
Thread, and Story stay in a separate "Other" bucket rather than being
force-fit into Long or Short.

## Phase 2 — Platform data model (built)

`platform_snapshots` table (`supabase/migrations/0012_platform_snapshots.sql`):
one row per brand/platform/day, manually entered, for the platforms with
no auto-syncing API (`src/lib/platforms.ts`: Instagram, TikTok, Threads,
Facebook; YouTube stays excluded, its stats already pull live via the
YouTube Data API elsewhere in the app). Timestamped snapshots rather than
a single mutable row, so count-over-time history is preserved for
Phase 3's graphs.

The Platforms modal (`src/components/platforms-modal.tsx`) now reads the
latest snapshot per platform (fetched in `src/app/(app)/layout.tsx`,
pre-fills the form) and writes through
`savePlatformCounts`/`getLatestPlatformCounts`
(`src/app/actions/platforms.ts`). Re-saving the same day upserts that
day's row instead of creating a duplicate.

## Phase 3 — Command Center graphs (built)

Two graphs in the Command Center main area, bottom
(`src/app/(app)/page.tsx`), computed by `src/lib/audience-growth.ts`:

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
