# Body-Mind-Soul Dashboard

Private, solo-use content operations dashboard for two brands:
LBsTransformation (personal transformation, Body/Mind/Soul) and LBsWorks
(build-in-public, digital products). Single user (Luxmi Bhaskar), no auth
complexity needed beyond a single login.

## Full spec

The complete feature specification, data model, and build phases live in
`/docs/builder-brief.md`. Read it in full before starting any new feature,
don't work from this file alone, it's a summary, not the source of truth.

## Tech stack

Next.js (React) + Vercel hosting + Supabase (Postgres + Auth) + Tailwind
CSS + Tremor (KPI/dashboard components) + react-d3-tree + Framer Motion
(Pillar Tree) + shadcn/ui.

## Current build phase

Building **Phase 1 (Core)** only, see Section 19 of the builder brief for
the exact list. Don't build Phase 2 or 3 features even if they'd be easy
to add alongside something in Phase 1, flag them as noted-for-later
instead of building them early.

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
