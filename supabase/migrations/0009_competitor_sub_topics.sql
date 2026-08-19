-- Competitors page "Add Competitor" form had no way to tag which
-- sub-topics a competitor is relevant to, independent of whether any
-- competitor_benchmarks rows exist for them yet. Pillar is deliberately
-- not a separate column: it's derived from these tags via
-- PILLAR_STRUCTURE (src/lib/pillars.ts) wherever needed, same as the
-- existing Pillar/Sub-topic filter on this page already treats them as
-- related but independently-driven.
alter table competitors
add column sub_topics text[] not null default '{}';
