-- docs/platform-performance-tracking.md Phase G: the last step of the
-- per-platform performance tracking migration. Every real dependent
-- found in the Phase A audit (Analytics Overview's KPIs and graphs,
-- Competitors' Avg Views, both backup layers - Sheets and Drive, the
-- Streak & Goals "Views" pseudo-goal, and the topic page's own
-- "Performance metrics" entry form) has been migrated to read from
-- content_platform_posts / content_platform_stats_snapshots
-- (0018_content_platform_posts.sql) instead, and verified live,
-- including a real Drive sync producing a real synced file with the
-- new per-platform breakdown. Safe to drop the old flat columns now.
--
-- conversions is NOT dropped: a business outcome, not a platform
-- engagement signal, has no per-platform equivalent in the new tables,
-- explicit decision made during Phase F rather than migrated as a side
-- effect of this one.
alter table content_calendar
  drop column views,
  drop column likes,
  drop column comments,
  drop column shares,
  drop column saves;
