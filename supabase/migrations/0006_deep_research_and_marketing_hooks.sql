-- Section 19, Scout/Deep Research/Calendar flow.
--
-- deep_research_data: the second, deeper pass beyond the initial Run
-- Research/Refresh Research pull, run against that pull's already-fetched
-- raw sources (no re-fetch). One per research_snapshots row, nullable,
-- populated on demand by the "Deep Research" action, not automatically.
alter table research_snapshots
  add column deep_research_data jsonb;

-- printable_marketing_hooks: "Printable / Marketing" deep-dive, visual/
-- text/verbal delivery-mode hooks, distinct from and coexisting with the
-- title_variants/hook_variants system (framing options, not delivery
-- mode). One current set per content item, regenerating replaces it.
alter table content_calendar
  add column printable_marketing_hooks jsonb;
