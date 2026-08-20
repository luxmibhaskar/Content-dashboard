-- Command Center redesign, Redesign Phase 2: manual follower/subscriber
-- counts for the platforms with no auto-syncing API (src/lib/platforms.ts;
-- YouTube stays excluded, its stats already pull live via the YouTube
-- Data API elsewhere in the app). Timestamped snapshots rather than a
-- single mutable row, so count-over-time is preserved for a future trend
-- view rather than only ever showing "right now". Written by the
-- Platforms modal (src/components/platforms-modal.tsx), which shipped as
-- an unwired entry form in Redesign Phase 1.
create table platform_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  platform text not null check (platform in ('Instagram', 'TikTok', 'Threads', 'Facebook')),
  follower_count integer not null check (follower_count >= 0),
  snapshot_date date not null default current_date,

  unique (brand, platform, snapshot_date)
);

create trigger trg_platform_snapshots_updated_at
  before update on platform_snapshots
  for each row execute function set_updated_at();

create index idx_platform_snapshots_brand_platform_date
  on platform_snapshots (brand, platform, snapshot_date desc);

-- Section 1: every table gets RLS + "Authenticated access only" (see the
-- RLS block at the end of 0001_init.sql), a new table needs its own
-- explicit statements since that block only covered tables that existed
-- at the time.
alter table platform_snapshots enable row level security;
create policy "Authenticated access only" on platform_snapshots
  for all to authenticated using (true) with check (true);
