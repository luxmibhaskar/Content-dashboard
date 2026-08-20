# Body-Mind-Soul Dashboard

Private, solo-use content operations dashboard for two brands:
LBsTransformation (personal transformation, Body/Mind/Soul) and LBsWorks
(build-in-public, digital products). Single user (Luxmi Bhaskar), no auth
complexity needed beyond a single login.

## Full spec

The complete feature specification, data model, and build phases live in
`/docs/builder-brief.md`. Three additional docs refine and partially
supersede it, always check these first for anything they cover:

- `/docs/brand-tokens.md` — authoritative colors, typography, spacing,
  and motion for both brands.
- `/docs/topic-page-redesign.md` — authoritative topic page structure and
  production status taxonomy, supersedes builder-brief.md Sections 9, 10.1,
  and 13 (marked with ⚠ notes at each affected section).
- `/docs/dashboard-redesign.md` — authoritative Today-page "Command
  Center" layout and the app-wide visual treatment pass, a separate
  4-phase track from builder-brief.md's own phases (see "Current build
  phase" below for how the two numbering schemes are told apart).

Where any of these three conflict with builder-brief.md, the newer, more
specific file wins, builder-brief.md remains correct for everything not
explicitly marked superseded. Read all relevant docs in full before
starting any new feature, don't work from summaries alone.

Instructions given in conversation that aren't yet captured in any doc
file are a gap, not a one-off. When conversation reveals real spec (a
redesign, a taxonomy, a phase breakdown) that has no home in these docs,
write it into the appropriate doc (or a new one, referenced here) rather
than letting it live only in that session's transcript.

## Tech stack

Next.js (React) + Vercel hosting + Supabase (Postgres + Auth) + Tailwind
CSS + Tremor (KPI/dashboard components) + react-d3-tree + Framer Motion
(Pillar Tree) + shadcn/ui.

## Current build phase

Two separate, unrelated phase numbering schemes exist in this project.
When "Phase N" comes up, always confirm which one is meant:

- **Builder-brief phases** (`docs/builder-brief.md` Section 19): Phase 1
  (Core), Phase 2 (Flow & Research), Phase 3 (Advanced). Status as of
  this note: Phase 1 and Phase 2 are substantially built. Phase 3 is
  partial, Hook Library and Weekly Review are built; the Pillar Tree
  (Section 15.1) was built then removed as part of the dashboard
  redesign below; the Services panel's live status checks and "Check
  Alternatives" research (Section 5.3) are not yet built.
- **Redesign phases** (`docs/dashboard-redesign.md`): Phase 1 (Command
  Center layout), Phase 2 (Platforms data model), and Phase 3 (Command
  Center graphs) are built. Phase 4 (full visual treatment) is specified
  in that doc but not yet built.

Don't build ahead of whichever phase is actually in progress even if a
later item would be easy to add alongside it, flag it as noted-for-later
instead.

## Two standing rules (Section 19 of the builder brief)

1. **Build full schemas upfront.** Every Supabase table should include
   its eventual full field set now, even fields that won't hold real data
   until Phase 2/3 (e.g. `is_archived`, `derived_from_content_id`). Empty
   fields cost nothing; adding columns to a live table later does.
2. **Never build UI for anything already known to be superseded within a
   phase or two.** If a field is explicitly legacy in the spec, it exists
   in the schema only, no dedicated UI gets built for it.

## Conventions

- No em dashes anywhere: UI copy, AI-generated text, code comments meant
  for a human to read. Hyphens with spaces, colons, or commas instead.
- All core tables are brand-scoped (a `brand` column:
  `lbstransformation` | `lbsworks`), except `service_alternative_checks`,
  which is system-level and shared across both.
- Any AI-generated text in the app itself (research synthesis,
  Title/Hook/Thumbnail suggestions) should flag low-confidence or thin
  research rather than fabricate specifics, per the anti-hallucination
  guardrail in the spec (Section 16).

## Secrets

Never commit real credentials. `.env.local` holds actual values
(gitignored). `.env.example` lists variable names only, keep it updated
whenever a new one gets added.

## Working style

Build in small, verifiable chunks, one feature at a time, not all of
Phase 1 in a single pass. After each chunk, say exactly what URL to open
and what to click to verify it works, assume no code review from me
directly. Commit after each working chunk with a clear message.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
