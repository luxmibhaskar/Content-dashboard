# Per-Platform Performance Tracking

**✅ Complete, shipped.** Everything in this doc is built and live. The
old `content_calendar` metrics columns
(`views/likes/comments/shares/saves`) were dropped in
`0019_drop_legacy_content_metrics.sql`, the retention-drop pair in
`0023_drop_content_calendar_retention_drop.sql`, and every dependent
(Analytics Overview KPIs and graphs, Competitors' "Avg Views", the
Sheets/Drive backup) was migrated to the two new tables first. The
"Migration" section at the bottom is kept as the historical record of
what that involved. Own-channel YouTube video tracking (Section 9) was
added on top of this model afterwards.

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
published_at (date + time, not date only). (`post_url` was added later
for Group I, see Section 9.) A single content item can have multiple
rows here, one per platform it went out on, added individually as it's
actually published there, not all upfront.

**content_platform_stats_snapshots** — one row per check-in, repeatable
over time. Fields: content_platform_post_id (FK), snapshot_date, views,
likes, comments, saves, shares, reposts, plus retention_drop_timestamp
and retention_drop_note (added by `0020_retention_drop_check_ins.sql`,
which also dropped the coarser, never-written
`content_platform_posts.retention_drop_note` this doc's first draft
listed above; retention drop is one reading per check-in, so it has to
live here to be trended). This is what "fill in time to time" means,
multiple entries per platform-post as it accumulates performance, not
one static number.

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

**Sitting above everything described below**, added after this doc was
written: the Analytics page now opens with a `Content | Platforms`
`SegmentedToggle` and a single consolidated filter bar (date-range
pills plus `Format` and `Platform` `FilterMenu` dropdowns). Both are
documented in `docs/dashboard-redesign.md`, in the "Analytics Platforms
view" and "Shared filter-bar patterns" sections. The Platforms view
(`?view=platforms`) renders the platform-goal list instead of the
content graphs; everything in the rest of this section is the `content`
view.

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

## 9. Own-channel YouTube video tracking (Group I, shipped)

Pull real view/like/comment counts for your own published YouTube video
straight from the Data API, into the same per-platform check-in model
above, instead of only ever typing them in by hand.

**Reuses the existing tables, no new one.** `content_platform_posts` /
`content_platform_stats_snapshots` are already exactly this granularity
(one row per platform a content item posted to, one row per check-in),
so this adds a single column rather than a table:

- **`content_platform_posts.post_url`** (`0025_content_platform_posts_url.sql`),
  nullable, generic name (not `youtube_url`, per the build-full-schemas
  convention). The one reliable link between a topic's YouTube
  platform-post and its actual video, pasted once by hand after
  publishing rather than relying on fuzzy title-matching.

**Library** (`src/lib/youtube.ts`, sibling to Group J's own
`fetchYouTubeChannelStats`):

- **`parseYouTubeVideoId(url)`**: extracts the video id from all three
  URL shapes: `watch?v=`, `youtu.be/`, and `shorts/`.
- **`fetchYouTubeVideoStats(videoId)`**: one `videos.list?part=statistics`
  call, returns view / like / comment counts.

**Actions** (`src/app/(app)/calendar/[id]/platform-stats-actions.ts`):

- **`updatePlatformPostUrl`**: saves the pasted link onto the
  platform-post row.
- **`refreshYouTubeVideoStats`**: on-demand pull that upserts into
  `content_platform_stats_snapshots` the exact same way a manual
  check-in does, keyed on `(content_platform_post_id, snapshot_date)`,
  so a refresh and a same-day manual edit never create a duplicate row,
  last write for the day wins.

**UI** (`src/components/platform-analytics-section.tsx`): the YouTube
platform-post's existing card gains a "Video URL" field and a "Refresh
from YouTube" button, matching Group J's `YouTubeRefreshButton` pattern
(shows the result or the error inline, leaves the prior numbers intact
on failure).

**Button-only for now.** No nightly-cron fold-in for per-video stats
(deferred per explicit instruction), unlike Group J's channel
subscriber refresh which does run nightly. A published video's counts
update only when the button is pressed.

## 9.1. Backfilling an already-published Short

Section 9 above assumes the normal direction: a content_calendar item
exists first (planned through Research/Packaging/Scripting), gets
published, and its YouTube URL is pasted in afterward. Long Form videos
always go through that pipeline before publishing, so they'll almost
always already exist as an item by the time a video goes live. Shorts
are made and published without that same planning, so the real need is
the reverse for Shorts specifically: pull an already-published Short
into the Calendar after the fact, creating its item from the video
instead of the other way round. Long Form technically works through
this same path if pasted here too, it's just not the case this was
built for, so it gets no extra handling (see "Deliberately not handled"
below).

**Entry point.** `AddFromYoutubeForm` (`src/components/add-from-
youtube-form.tsx`), a small form next to "+ New" on the Calendar list
(`calendar/page.tsx`): paste a URL, get taken to the new item's topic
page, or see an inline error and stay on the list. A client component,
unlike "+ New"'s plain `<form action={...}>`, because this call can
fail (bad URL, video not found, YouTube API error) and needs to surface
that without navigating away - it calls the server action directly and
awaits it (same pattern as the Notes tab's cards), then `router.push`es
to the new item itself on success rather than having the action
`redirect()`, mirroring the ok/error split `refreshYouTubeVideoStats`
(Section 9) already uses for the same reason.

**Library** (`src/lib/youtube.ts`):
- **`fetchYouTubeVideoDetails(videoId)`**: sibling to
  `fetchYouTubeVideoStats`, one `videos.list` call with
  `part=snippet,statistics` instead of `statistics` alone, returning
  title/description/publishedAt alongside the same counts.
- **`isYouTubeShortsUrl(url)`**: format inference, the `/shorts/` URL
  path `parseYouTubeVideoId` already recognizes, asked the other way
  round.

**Action** (`createContentItemFromYouTube`,
`src/app/(app)/calendar/actions.ts`): parses the video id, fetches its
details, then three inserts - `content_calendar` (title/description
from YouTube, `format` from `isYouTubeShortsUrl`, `production_status`
set straight to "Published / Scheduled" since it's already live,
`platform: ["YouTube"]`, `publish_date` from the video's real publish
time), `content_platform_posts` (the YouTube row with its real
`published_at` and `post_url`, rather than the `now()` default that
applies when a platform is added the normal way), and one
`content_platform_stats_snapshots` row seeded from the pulled counts.
Not wrapped in a transaction, same non-transactional shape
`updateContentItem` already has for its own calendar-row-then-posts-row
writes - acceptable here for the same reason.

**Fields left for the topic page, same as every other creation path.**
Pillar and sub-topic aren't set (YouTube has no concept of either), left
exactly as unset as a blank "+ New" item's are, editable afterward like
normal. The Research/Packaging/Scripting tabs still exist on a backfilled
item's topic page even though nothing produced it that way; they're just
never used for one, no code branches on how an item was created.

**Deliberately not handled**, since Shorts (not general backfill) is the
actual use case: format detection is URL-shape only (a Short opened via
a plain `watch?v=` link instead of `/shorts/` misdetects as Long Video,
not worth a second API call against `contentDetails.duration` to catch);
no handling for playlists, live streams, or region/membership-locked
videos beyond whatever error the API itself returns.

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
