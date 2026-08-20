# Command Center Redesign

Redesign of the Today page (`src/app/(app)/page.tsx`) into a "Command
Center" layout, plus an app-wide visual treatment pass. This is a
separate track from `builder-brief.md`'s own Phase 1/2/3 build phases,
see the naming note in `CLAUDE.md` for how to tell the two apart when
either is mentioned as just "Phase N". Phases 1 and 2 below are already
built; 3 and 4 are specified but not yet built.

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

## Phase 3 — Command Center graphs (not yet built)

Two graphs in the Command Center main area, bottom, replacing the old
large single content box:

- **Graph 1, Total Audience Growth**: line graph aggregating total
  followers/subscribers across all platforms over time, sourced from
  Phase 2's `platform_snapshots` data.
- **Graph 2, toggleable between three views**:
  - **Audience Distribution** — doughnut, percentage by platform.
  - **Growth Velocity** — bar graph, week-over-week change.
  - **Output vs Milestone** — dual-axis line, content output volume
    (reuse `src/lib/content-output.ts`'s existing counts) against
    audience growth.

Both graphs will show sparse or empty data until real snapshot history
accumulates. Flag that plainly in the UI (e.g. "not enough history yet")
rather than rendering a chart that just looks broken or misleadingly
flat.

## Phase 4 — Full visual treatment (not yet built)

App-wide "AAA-game" visual pass, using each brand's own token colors
(`docs/brand-tokens.md`) instead of generic neon:

- LBsTransformation: Clay Terracotta `#C26D4C`, Deep Teal `#0F766E`,
  Iron Charcoal `#1F2937`.
- LBsWorks: Build Indigo `#4F46E5`, Sell Amber `#F59E0B`, Scale Green
  `#10B981`.

Extends the existing light/dark toggle (already built, not replaced)
with frosted glassmorphism containers and glowing edges in each brand's
colors, matching `design-reference/dashboard-reference.jpg`'s
glassmorphism style but re-colored to brand tokens instead of its
generic neon.

Applies to every container and card across the entire app, no scoped-down
exceptions, including text-heavy work surfaces like the Research & Copy
summary and Scripts content:

- Slow idle floating/breathing animation.
- A reactive hover glow that follows cursor position.
- A parallax 3D tilt that tracks the cursor.
