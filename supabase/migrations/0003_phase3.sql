-- ---------------------------------------------------------------------
-- 17. quick_capture (Section 13). Missed in the Phase 1 schema pass,
-- adding now under the same "full schema upfront" rule (Section 19)
-- as everything else, even though Quick Capture itself is Phase 3.
-- ---------------------------------------------------------------------
create table quick_capture (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  url text not null,
  pillar text,
  quick_hook_notes text,
  quick_rehook_notes text,
  quick_cta_notes text,
  content_type text check (content_type in ('Competitor', 'Inspiration', 'Trend', 'Other')),
  competitor_name text,
  status text not null default 'Inbox' check (status in ('Inbox', 'Reviewed', 'Migrated'))
);

create trigger trg_quick_capture_updated_at
  before update on quick_capture
  for each row execute function set_updated_at();

create index idx_quick_capture_brand_status on quick_capture (brand, status);

alter table quick_capture enable row level security;
create policy "Authenticated access only" on quick_capture for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Section 5.3 live status enhancement: Supabase's own storage usage
-- has no REST endpoint reachable with the anon/service keys already in
-- use, but Postgres exposes it directly. security definer so the
-- authenticated app role can call it without needing table-level
-- grants on pg_database.
-- ---------------------------------------------------------------------
create or replace function get_database_size_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$
  select pg_database_size(current_database());
$$;

grant execute on function get_database_size_bytes() to authenticated;
