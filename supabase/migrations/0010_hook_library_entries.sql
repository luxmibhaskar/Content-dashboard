-- New, standalone Hook Library: a swipe-file of delivery-mode hook
-- examples (Visual/Text/Verbal), imported from a CSV/JSON file or typed
-- in directly, independent of any specific content_calendar item. This
-- is deliberately a different thing from the existing hook_variants
-- table (which is always tied to one content item and competes on
-- framing, not delivery mode) and from the deprecated
-- printable_marketing_hooks field on content_calendar (one triplet per
-- topic, generation UI already removed, stays schema-only per that
-- earlier decision). Coexists with, doesn't replace, the real-usage
-- aggregation on /hook-library that builder-brief.md Section 11
-- documents (Weekly Review depends on that staying intact).
create table hook_library_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  type text not null check (type in ('visual', 'text', 'verbal')),
  content text not null
);

create trigger trg_hook_library_entries_updated_at
  before update on hook_library_entries
  for each row execute function set_updated_at();

create index idx_hook_library_entries_brand_type on hook_library_entries (brand, type);

-- Section 1: every table gets RLS + "Authenticated access only" (see
-- the RLS block at the end of 0001_init.sql), a new table needs its own
-- explicit statements since that block only covered tables that existed
-- at the time.
alter table hook_library_entries enable row level security;
create policy "Authenticated access only" on hook_library_entries
  for all to authenticated using (true) with check (true);
