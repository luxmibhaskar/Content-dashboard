-- GROUP H: retire content_calendar's per-item retention-drop columns.
--
-- content_calendar.retention_drop_timestamp / retention_drop_note
-- (0001_init.sql) lost their only UI setter in topic-page-redesign.md
-- Section 9 and never got one back. They were superseded by a per-
-- check-in pair on content_platform_stats_snapshots
-- (0020_retention_drop_check_ins.sql), which has a real writer (the
-- "Log a check-in" form in platform-analytics-section.tsx) and its own
-- Analytics section (Retention Drop Trends). Until now they were kept
-- schema-only per this project's "superseded field stays" convention,
-- still read by the Sheets/Drive backup for grandfathered data.
--
-- Confirmed before dropping: the only two rows carrying any value hold
-- junk test data ("swerftgyhjklkjhgfdcx" / "dcfvgb"), and nothing reads
-- these columns except the backup export (updated in the same commit as
-- this migration). Analytics, the topic page, the archive/retrieve
-- path, and the companion JSON never touched them.
alter table content_calendar
  drop column retention_drop_timestamp,
  drop column retention_drop_note;
