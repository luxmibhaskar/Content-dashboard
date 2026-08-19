-- Research & Copy's Run now runs as 3 separate Claude calls (summary,
-- sources & containers, titles/description/tags) instead of 2, sharing one
-- web search pass. This column holds live per-step status so the tab can
-- poll and show real incremental progress instead of one long silent wait.
-- Written and overwritten each Run, no history, same convention as
-- research_copy itself.
alter table content_calendar
add column research_progress jsonb;
