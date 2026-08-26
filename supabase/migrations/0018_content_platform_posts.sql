-- docs/platform-performance-tracking.md Section 2: real per-platform,
-- time-series performance tracking, replacing content_calendar's single
-- performance-metrics block (views/likes/comments/shares/saves/
-- conversions). Mirrors the already-proven platform_snapshots pattern
-- (brand-level audience tracking, 0012/0014_platform_snapshots*.sql),
-- scoped to individual content items instead. Applies to both Long Form
-- and Short Form content (Section 1's toggle is a filtered view over
-- content_calendar by format, not a separate table). Two tables only,
-- nothing removed from content_calendar yet, see the doc's own
-- Migration section for what has to move onto these tables first before
-- the old columns can go.

-- content_platform_posts: one row per platform a specific content item
-- was actually posted to, added individually as it's actually published
-- there (Section 3), not all upfront. platform stays a plain freeform
-- text column, no CHECK constraint, same reasoning as
-- 0014_platform_snapshots_any_platform.sql: Format's own "Posted on"
-- picker (format-platform-fields.tsx) already sources platform names
-- freely from Streak & Goals, this has to accept the same set. unique
-- (content_id, platform): one row per platform per item, matching how
-- the multiselect it's written from already behaves (a platform is
-- either posted or not, not posted N separate times).
create table content_platform_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  platform text not null,
  -- Real date + time, not the vague publish_date content_calendar used
  -- to approximate posting time from (Section 8's "Content Posted Time"
  -- reads this).
  published_at timestamptz not null default now(),
  retention_drop_note text,

  unique (content_id, platform)
);

create trigger trg_content_platform_posts_updated_at
  before update on content_platform_posts
  for each row execute function set_updated_at();

create index idx_content_platform_posts_content_id on content_platform_posts (content_id);

alter table content_platform_posts enable row level security;
create policy "Authenticated access only" on content_platform_posts
  for all to authenticated using (true) with check (true);

-- content_platform_stats_snapshots: one row per check-in, repeatable
-- over time (multiple entries per platform-post as it accumulates
-- performance, not one static number), mirroring platform_snapshots'
-- own snapshot-per-day shape. Metrics stay nullable: a check-in can log
-- whatever's actually available that day, same "each field is
-- independently optional" spirit as content_calendar's own performance
-- fields today. unique (content_platform_post_id, snapshot_date): one
-- entry per platform-post per day, preventing accidental double-logging
-- while still allowing genuine repeat entries across different days.
create table content_platform_stats_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_platform_post_id uuid not null references content_platform_posts(id) on delete cascade,
  snapshot_date date not null default current_date,

  views bigint check (views >= 0),
  likes bigint check (likes >= 0),
  comments bigint check (comments >= 0),
  saves bigint check (saves >= 0),
  shares bigint check (shares >= 0),
  reposts bigint check (reposts >= 0),

  unique (content_platform_post_id, snapshot_date)
);

create trigger trg_content_platform_stats_snapshots_updated_at
  before update on content_platform_stats_snapshots
  for each row execute function set_updated_at();

create index idx_content_platform_stats_snapshots_post_date
  on content_platform_stats_snapshots (content_platform_post_id, snapshot_date desc);

alter table content_platform_stats_snapshots enable row level security;
create policy "Authenticated access only" on content_platform_stats_snapshots
  for all to authenticated using (true) with check (true);
