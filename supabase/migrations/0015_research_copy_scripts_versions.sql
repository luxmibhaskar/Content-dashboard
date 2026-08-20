-- Manual (pasted) and AI (Run) research/scripts now coexist per content
-- item instead of one overwriting the other. Mirrors the proven
-- title_variants/hook_variants/thumbnail_variants pattern (0001_init.sql):
-- one row per version, is_live marks the active one, a partial unique
-- index enforces at most one active row per content item. Unlike those
-- tables, at most one row per (content_id, source) too: "regenerated
-- wholesale each time, no history" still holds, just scoped per source
-- now instead of per item, re-running AI overwrites only the AI row,
-- re-pasting Manual overwrites only the Manual row.
create table research_copy_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  source text not null check (source in ('manual', 'ai')),
  data jsonb not null,
  is_live boolean not null default false,

  unique (content_id, source)
);

create trigger trg_research_copy_versions_updated_at
  before update on research_copy_versions
  for each row execute function set_updated_at();

create index idx_research_copy_versions_content_id on research_copy_versions (content_id);

create unique index idx_research_copy_versions_one_live_per_content
  on research_copy_versions (content_id) where is_live;

create table scripts_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  source text not null check (source in ('manual', 'ai')),
  data jsonb not null,
  is_live boolean not null default false,

  unique (content_id, source)
);

create trigger trg_scripts_versions_updated_at
  before update on scripts_versions
  for each row execute function set_updated_at();

create index idx_scripts_versions_content_id on scripts_versions (content_id);

create unique index idx_scripts_versions_one_live_per_content
  on scripts_versions (content_id) where is_live;

alter table research_copy_versions enable row level security;
create policy "Authenticated access only" on research_copy_versions
  for all to authenticated using (true) with check (true);

alter table scripts_versions enable row level security;
create policy "Authenticated access only" on scripts_versions
  for all to authenticated using (true) with check (true);

-- Existing single-blob data all came from a real AI Run (paste-import
-- didn't exist before this), migrates in as the 'ai' source and becomes
-- the active version on each item that had one, preserving current
-- behavior for every existing item until someone adds a Manual version
-- alongside it.
insert into research_copy_versions (content_id, brand, source, data, is_live)
select id, brand, 'ai', research_copy, true
from content_calendar
where research_copy is not null;

insert into scripts_versions (content_id, brand, source, data, is_live)
select id, brand, 'ai', scripts, true
from content_calendar
where scripts is not null;

alter table content_calendar drop column research_copy;
alter table content_calendar drop column scripts;
