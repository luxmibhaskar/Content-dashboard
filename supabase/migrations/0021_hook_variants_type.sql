-- Analytics audit (2026-08-27) Phase 4: docs/builder-brief.md Section
-- 6.3's Hook Type Performance graph has sat as an empty shell since
-- Phase 1 of this whole build, waiting on hook_type "wired directly to
-- the live variant" per that same section - useHook (hook-actions.ts)
-- has received hookType (visual/text/verbal, src/lib/types.ts's
-- HOOK_LIBRARY_TYPES) at the exact moment a hook gets marked live since
-- Phase E, and discarded it every time, nothing on hook_variants ever
-- recorded which kind of hook a content item actually used.
alter table hook_variants
  add column hook_type text check (hook_type in ('visual', 'text', 'verbal'));
