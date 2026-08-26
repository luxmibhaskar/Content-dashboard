-- Analytics audit (2026-08-27) Phase 3: retention drop rebuilt onto the
-- repeatable check-in table. content_calendar.retention_drop_timestamp/
-- note (0001_init.sql) was always one value per item with no way to see
-- it change; its only UI setter was removed in topic-page-redesign.md
-- Section 9 and never came back, so it stays in content_calendar
-- unused, schema-only, per this project's "superseded field stays
-- schema-only" convention (still read by the Sheets/Drive backup for
-- whatever was recorded before that removal). Tracking whether a video's
-- drop point is moving later (improving) or earlier (worsening) requires
-- comparing it across check-ins, so the real version has to live on
-- content_platform_stats_snapshots, one reading per check-in.
alter table content_platform_stats_snapshots
  add column retention_drop_timestamp text,
  add column retention_drop_note text;

-- content_platform_posts.retention_drop_note (0018_content_platform_posts.sql)
-- never had a write path anywhere (confirmed via full grep before this
-- migration was written) and claimed the same concept the two columns
-- above now properly implement, one level too coarse (per platform-post
-- instead of per check-in). Two fields competing for one idea, one real
-- and one permanently empty, is worse than one - dropped rather than
-- repurposed since nothing ever wrote to it, there's no data to lose.
alter table content_platform_posts
  drop column retention_drop_note;
