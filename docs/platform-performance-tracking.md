# Per-Platform Performance Tracking

Replaces content_calendar's single performance-metrics block (views,
likes, comments, shares, saves, conversions) with real per-platform,
time-series tracking. Applies to both Long Form and Short Form content.
This is a breaking change to several already-working features, read the
migration section before removing anything.

## 1. Content Calendar: Long Form / Short Form toggle

Top-level toggle on the Calendar list view. Both reuse the existing
content_calendar table (already brand-scoped, already has pillar/
sub-topic/format), differentiated by the item's format. No separate
table for short-form items, one table, filtered view.

## 2. New data model

Two new tables, mirroring the already-proven platform_snapshots
pattern (brand-level audience tracking), scoped to individual content
items instead:

**content_platform_posts** — one row per platform a specific content
item was actually posted to. Fields: content_id (FK), platform name,
published_at (date + time, not date only), retention_drop_note.
A single content item can have multiple rows here, one per platform it
went out on, added individually as it's actually published there, not
all upfront.

**content_platform_stats_snapshots** — one row per check-in, repeatable
over time. Fields: content_platform_post_id (FK), snapshot_date, views,
likes, comments, saves, shares, reposts. This is what "fill in time to
time" means, multiple entries per platform-post as it accumulates
performance, not one static number.

## 3. Title container fields (Short Form, matching Long Form's existing pattern)

Title, short description, pillar, sub-topic, publish date, and a
platform picker (multi-select, add one at a time as actually posted,
each addition creates a content_platform_posts row per item 2).
Production status and pillar tag shown in the title container itself,
same visual pattern already built for Long Form.

## 4. Per-item Analytics section

Both Long Form and Short Form topic pages get an Analytics section
directly below Production Status. Multiple graphs, one per platform the
item has been posted to, performance over time, sourced from
content_platform_stats_snapshots. Also surface: which hook was used
(item 7) and its performance, and for Short Form, the "Idea derived
from" link (item 6).

## 5. Every new container is collapsible

Applies to all new UI built for this feature, matching the existing
collapsible pattern already used elsewhere in the app.

## 6. Repurposing: "Idea derived from" picker

Reuses the existing derived_from_content_id field (built earlier, on
the derivative/short side only). Add a proper picker to each Short Form
item: dropdown, filterable by pillar, showing the latest 5 Long Form
topics for that pillar. This is a better UI on top of an already-working
field, not new plumbing underneath it.

## 7. Hook tracking

Add a "hook used" association on both Long Form and Short Form items.
On Long Form specifically, both Manual and AI sides: each of the three
hook types (visual/text/verbal) gets a "Use" action. Using one:
- Auto-adds that hook to Hook Library.
- Marks it as the hook used on this content item, feeding into this
  item's Analytics section (item 4) and the Analytics page's hook
  performance view.
Title's "Use" action auto-fills the item's main Title field.

## 8. Analytics page: renames and rebuilds

- "Best Time to Post" → "Content Posted Time". Sources from
  content_platform_posts.published_at (real date+time, not the vague
  publish_date this used to approximate from). Shows posting-time
  patterns separately for Long Form and Short Form.
- "Repurposing Performance" stays conceptually the same (which Long
  Form idea a Short Form piece came from) but should now show real
  performance comparison using the new per-platform data, not the old
  single-snapshot metrics.
- Full audit needed (see migration section) on every other existing
  KPI/graph that read the old metrics fields.

## Migration: what breaks and needs fixing first

The fields being removed (content_calendar.views/likes/comments/shares/
saves/conversions) are not simply unused, they are the direct data
source for:
- Analytics Overview's KPIs and core graphs (Total Views, Performance
  by Pillar, Hook Type Performance, Pillar Balance, and likely others).
- Competitors' whole-account "Avg Views" calculation (joins
  competitor_benchmarks against these exact content_calendar columns).
- The Google Sheets and Drive backup layers, which currently sync these
  columns as part of content_calendar's data.

Before removing these columns, every one of the above needs to be
migrated to read from content_platform_stats_snapshots instead
(aggregated appropriately, e.g. summed across all platforms for a
"total views" KPI). Do not remove the old columns until every
confirmed dependent is migrated and verified working against the new
tables. This is the same audit-before-delete discipline already applied
successfully earlier tonight (System & Production, Competitor
Benchmarks removals), just at real scale here, worth taking seriously.
