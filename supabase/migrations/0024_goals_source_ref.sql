-- GROUP J: per-platform external identifier for API auto-sync.
--
-- Holds the thing an external API needs to identify this platform's
-- account, currently only a YouTube channel id or @handle, used by the
-- YouTube auto-update (refresh button + nightly cron) to pull a live
-- subscriber count into platform_snapshots. Null for every platform
-- that has no auto-sync (which is all of them except YouTube today);
-- kept schema-only for the rest per this project's "build full schemas
-- upfront" standing rule, so wiring another auto-syncing platform later
-- needs no migration.
--
-- Not on platform_snapshots: this is stable per-account config, not a
-- per-reading value, so it belongs next to the goal's other config
-- (platform_name, icon_slug, target_value).
alter table goals
  add column source_ref text;
