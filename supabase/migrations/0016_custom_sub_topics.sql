-- Body-Mind-Soul Dashboard: custom sub-topics
-- Extends the fixed PILLAR_STRUCTURE vocabulary (src/lib/pillars.ts) with
-- user-added sub-topics per brand/pillar. Pillars themselves stay fixed,
-- this is sub-topics only, merged in wherever the app reads the pillar
-- structure (src/lib/custom-sub-topics.ts).

create table custom_sub_topics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  pillar text not null,
  sub_topic text not null,
  is_archived boolean not null default false,

  unique (brand, pillar, sub_topic)
);

create trigger trg_custom_sub_topics_updated_at
  before update on custom_sub_topics
  for each row execute function set_updated_at();

alter table custom_sub_topics enable row level security;
create policy "Authenticated access only" on custom_sub_topics
  for all to authenticated using (true) with check (true);
