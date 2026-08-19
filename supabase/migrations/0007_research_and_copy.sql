-- docs/topic-page-redesign.md: replaces the old research_snapshots-based
-- Run Research/Refresh Research pipeline. One current research pass per
-- item, regenerated wholesale on each "Run" (no history/snapshots, per
-- the spec's "one Run, full depth from the start"). research_snapshots
-- itself is left in place (existing archived data, existing schema),
-- just no longer written to by the new flow.
alter table content_calendar
add column research_copy jsonb;

-- Scripts tab (docs/topic-page-redesign.md Section 2, Tab 2), schema
-- added now per the "build full schemas upfront" convention even though
-- the Scripts tab UI itself is a later piece.
alter table content_calendar
add column scripts jsonb;
