-- Idea Panel format field: narrows to Long/Short (matching Content
-- Calendar's own format-platform-fields.tsx) and gains the same "posted
-- on" platform picker, sourced dynamically from goals.platform_name, no
-- separate hardcoded list. content_calendar.format/platform (0001_init.sql)
-- is the exact pattern this mirrors, same column shapes.
alter table ideas
  add column platform text[] not null default '{}';
