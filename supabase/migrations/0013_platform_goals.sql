-- Streak & Goals redesign: goals become per-platform (any platform,
-- freeform name, not the old fixed target_metric enum). platform_name
-- is the new display label going forward; goal_text stays in the
-- schema (still not null on old rows) but no longer gets its own UI,
-- new inserts just mirror platform_name into it to satisfy the
-- constraint, per this project's "superseded field stays schema-only"
-- convention rather than a destructive column drop.
--
-- icon_slug: a Simple Icons slug (see src/lib/platform-icons.ts) for
-- the "pick from a set" icon source. icon_url: unused for now, built
-- ahead of need for the "upload your own" icon source deferred to a
-- later follow-up (this project's "build full schemas upfront"
-- standing rule), so adding that capability later doesn't need a
-- schema migration.
alter table goals
  add column platform_name text,
  add column icon_slug text,
  add column icon_url text;
