-- Body-Mind-Soul Dashboard: initial schema
-- Builds the full field set for every core table now (builder-brief.md
-- Section 19, standing rule 1), even fields with no UI until Phase 2/3.
-- Ref: docs/builder-brief.md Section 3 (data model) and Section 19 (phases).

create extension if not exists pgcrypto;

create type brand_type as enum ('lbstransformation', 'lbsworks');
create type content_format_type as enum ('Reel', 'Short', 'Long Video', 'Post', 'Thread', 'Story', 'Other');
create type idea_source_type as enum ('Comment', 'DM', 'Mind', 'Competitor', 'Internet');

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 1. journey_log (Section 7)
-- ---------------------------------------------------------------------
create table journey_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  entry_date date not null default current_date,
  pillar_focus text[] not null default '{}',
  sub_topic text[] not null default '{}',
  what_i_did_experienced text,
  key_lesson_insight text,
  proof_results text,
  mood_energy text,
  tags_keywords text,

  -- Section 9.1 (Personal Angle Bank = journey_log rows where this is true)
  angle_worthy boolean not null default false
);

create trigger trg_journey_log_updated_at
  before update on journey_log
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 2. content_calendar (Section 10), the core working table.
-- Referenced by ideas, variants, benchmarks, reference_videos,
-- research_snapshots, so it's created early.
-- ---------------------------------------------------------------------
create table content_calendar (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  -- Header
  final_title text,
  production_status text not null default 'Idea'
    check (production_status in ('Idea', 'Scripting', 'Filming', 'Editing', 'Scheduled', 'Published')),
  viability_status text not null default 'Ready'
    check (viability_status in ('Ready', 'Waiting for Evidence', 'Needs More Time', 'On Hold')),
  viability_reason_note text,
  is_locked boolean not null default false,
  unlock_condition text,
  derived_from_content_id uuid references content_calendar(id),
  is_archived boolean not null default false,
  last_active_at timestamptz,

  -- Copy-Ready Panel (auto-populated from top-ranked research, editable)
  final_description text,
  plain_keyword_tags text[] not null default '{}',
  question_style_tags text[] not null default '{}',

  -- 10.1.1 Creator Input (Internal)
  raw_idea_title text,
  raw_keywords_topics text,
  brief_intent text,
  content_angle_hook_direction text,
  reference_inspiration text,
  target_stage_viewer_journey text
    check (target_stage_viewer_journey in ('Awareness', 'Consideration', 'Decision')),
  my_angle_unique_pov text,
  related_journey_entry_ids uuid[] not null default '{}',
  proof_credibility text,
  tone_style text
    check (tone_style in ('Friendly / Big Brother', 'Direct / No-BS', 'Calm / Meditative', 'Energetic / Motivational', 'Story-driven', 'Teaching / Explainer')),
  idea_source idea_source_type,
  source_detail text,

  -- 10.1.2 Viewer POV (Audience-Facing)
  viewer_problem text,
  promise_outcome text,
  final_title_hook text,
  viewer_keywords_search_phrases text,
  viewer_description text,
  primary_emotion_pain_point text,
  objections_doubts text[] not null default '{}',
  desired_action_cta text,
  completeness_checklist jsonb not null default '[]',
  format_recommendation text,

  -- 10.1.3 Research Output, core/detailed tags live on the item itself;
  -- ranked Title/Hook/Thumbnail suggestions live in the variants tables.
  core_tags text[] not null default '{}',
  detailed_viewer_search_phrase_tags text[] not null default '{}',

  -- 10.1.4 Publishing Ready (per platform), keyed by platform name, e.g.
  -- {"YouTube": {"platform_title": "...", "platform_description": "...",
  --   "platform_tags_hashtags": "...", "platform_angle_line": "..."}}
  platform_publishing jsonb not null default '{}',

  -- 10.1.5 Recording Section, Cue Cards
  -- main_pointers: [{"point_text": "...", "landing_line": "...", "runtime_estimate_seconds": 30}]
  main_pointers jsonb not null default '[]',
  energy_tag text,
  full_script text,
  voice_memo_transcript text,

  -- 10.1.6 System & Production
  pillar text,
  sub_topic text,
  format content_format_type,
  platform text[] not null default '{}',
  publish_date timestamptz,
  sequence_step text,
  sequence_order_custom numeric,
  evidence_condition text,
  script_outline_link text,
  published_url text,
  performance_notes text,
  series_playlist text,
  search_demand_trend_signal text,
  -- Legacy field, superseded by competitor_benchmarks below (Section 19,
  -- standing rule 2), schema only, no dedicated UI.
  benchmark_comparable_content text[] not null default '{}',
  success_metric_focus text
    check (success_metric_focus in ('Reach', 'Engagement', 'Retention', 'Conversion')),
  follow_up_content_ideas text[] not null default '{}',
  analytics_review_date date,
  retention_drop_timestamp text,
  retention_drop_note text,
  earned_the_click text check (earned_the_click in ('Yes', 'No', 'Unsure')),
  earned_click_note text,

  -- Performance metrics (Section 6.2 KPIs). Must survive hot/cold
  -- archiving (Section 17.4) since All-time analytics depend on them.
  -- Left nullable, not defaulted to 0, so "never tracked" (null) stays
  -- distinguishable from "tracked, genuinely zero" for the KPI cards
  -- that must hide gracefully when a metric isn't tracked (Section 6.2).
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  conversions bigint
);

create trigger trg_content_calendar_updated_at
  before update on content_calendar
  for each row execute function set_updated_at();

create index idx_content_calendar_brand_publish_date on content_calendar (brand, publish_date);
create index idx_content_calendar_derived_from on content_calendar (derived_from_content_id);

-- ---------------------------------------------------------------------
-- 3. ideas (Section 8)
-- ---------------------------------------------------------------------
create table ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  idea_title text not null,
  pillar text,
  sub_topic text,
  format content_format_type,
  brief_description text,
  reference_url text,
  idea_source idea_source_type,
  source_detail text,
  status text not null default 'Idea'
    check (status in ('Idea', 'Research', 'Ready to work')),
  migrated_to_content_id uuid references content_calendar(id)
);

create trigger trg_ideas_updated_at
  before update on ideas
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 4-6. title_variants / hook_variants / thumbnail_variants (Section 10.1.3)
-- ---------------------------------------------------------------------
create table title_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  variant_text text not null,
  rank int,
  source text not null default 'Custom' check (source in ('Research-based', 'Custom')),
  performance_rating numeric,
  is_live boolean not null default false
);

create trigger trg_title_variants_updated_at
  before update on title_variants
  for each row execute function set_updated_at();

create index idx_title_variants_content_id on title_variants (content_id);

-- At most one live variant per content item (Section 10.1.3's "Use This"
-- radio-style exclusivity, the Copy-Ready panel and Hook Library both
-- assume exactly one).
create unique index idx_title_variants_one_live_per_content
  on title_variants (content_id) where is_live;

create table hook_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  variant_text text not null,
  rank int,
  source text not null default 'Custom' check (source in ('Research-based', 'Custom')),
  performance_rating numeric,
  is_live boolean not null default false
);

create trigger trg_hook_variants_updated_at
  before update on hook_variants
  for each row execute function set_updated_at();

create index idx_hook_variants_content_id on hook_variants (content_id);

create unique index idx_hook_variants_one_live_per_content
  on hook_variants (content_id) where is_live;

create table thumbnail_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  rank int,
  source text not null default 'Custom' check (source in ('Research-based', 'Custom')),
  performance_rating numeric,
  is_live boolean not null default false,

  concept text,
  main_text_on_image text,
  visual_elements text,
  emotion_vibe text
);

create trigger trg_thumbnail_variants_updated_at
  before update on thumbnail_variants
  for each row execute function set_updated_at();

create index idx_thumbnail_variants_content_id on thumbnail_variants (content_id);

create unique index idx_thumbnail_variants_one_live_per_content
  on thumbnail_variants (content_id) where is_live;

-- ---------------------------------------------------------------------
-- 7. weekly_reviews (Section 12)
-- ---------------------------------------------------------------------
create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  week_start_date date not null,
  week_end_date date not null,
  posted_as_planned text,
  pillar_balance_notes text,
  retention_drop_patterns text,
  hook_library_insights text,
  earned_click_updates text,
  next_week_adjustment text,

  unique (brand, week_start_date)
);

create trigger trg_weekly_reviews_updated_at
  before update on weekly_reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 8. competitors (Section 14.1)
-- ---------------------------------------------------------------------
create table competitors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  name text not null,
  platform text,
  profile_url text,
  notes text,
  active boolean not null default true
);

create trigger trg_competitors_updated_at
  before update on competitors
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 9. competitor_benchmarks (Section 10.1.6)
-- ---------------------------------------------------------------------
create table competitor_benchmarks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  competitor_id uuid references competitors(id),
  competitor_name text,
  platform text,
  url text,
  why_benchmark text,
  notes text
);

create trigger trg_competitor_benchmarks_updated_at
  before update on competitor_benchmarks
  for each row execute function set_updated_at();

create index idx_competitor_benchmarks_content_id on competitor_benchmarks (content_id);

-- ---------------------------------------------------------------------
-- 10. backup_log (Section 17)
-- ---------------------------------------------------------------------
create table backup_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  sync_date timestamptz not null default now(),
  layer text check (layer in ('sheets', 'drive')),
  status text not null check (status in ('success', 'failure')),
  error_message text,
  retry_count int not null default 0
);

create trigger trg_backup_log_updated_at
  before update on backup_log
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 11. reference_videos (Section 10.2.1)
-- ---------------------------------------------------------------------
create table reference_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  url text not null,
  hook_note text,
  rehook_note text,
  cta_note text,
  date_added timestamptz not null default now()
);

create trigger trg_reference_videos_updated_at
  before update on reference_videos
  for each row execute function set_updated_at();

create index idx_reference_videos_content_id on reference_videos (content_id);

-- ---------------------------------------------------------------------
-- 12. research_snapshots (Section 10.2.3), append-only, never edited.
-- ---------------------------------------------------------------------
create table research_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  snapshot_date timestamptz not null default now(),
  youtube_data jsonb,
  google_data jsonb,
  reddit_data jsonb,
  quora_data jsonb,
  summary text
);

create trigger trg_research_snapshots_updated_at
  before update on research_snapshots
  for each row execute function set_updated_at();

create index idx_research_snapshots_content_id_date on research_snapshots (content_id, snapshot_date desc);

-- ---------------------------------------------------------------------
-- 13. daily_streaks (Section 5.0)
-- ---------------------------------------------------------------------
create table daily_streaks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  streak_date date not null,
  walked boolean not null default false,
  posted boolean not null default false,

  unique (brand, streak_date)
);

create trigger trg_daily_streaks_updated_at
  before update on daily_streaks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 14. service_alternative_checks (Section 5.3), system-level, NO brand
-- column; this is the one documented exception to brand-scoping.
-- ---------------------------------------------------------------------
create table service_alternative_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  service_name text not null,
  checked_date timestamptz not null default now(),
  findings_summary text,
  verdict text
);

create trigger trg_service_alternative_checks_updated_at
  before update on service_alternative_checks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 15. goals (Section 6.5)
-- ---------------------------------------------------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  goal_text text not null,
  target_metric text
    check (target_metric in ('Subscribers/Followers', 'Views', 'Revenue', 'Community Members', 'Custom')),
  target_value numeric,
  current_value numeric,
  target_date date,
  status text not null default 'On Track'
    check (status in ('On Track', 'Behind', 'Achieved', 'Abandoned'))
);

create trigger trg_goals_updated_at
  before update on goals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 16. collaborators (Section 14.3)
-- ---------------------------------------------------------------------
create table collaborators (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  name text not null,
  platform text,
  profile_url text,
  status text not null default 'Identified'
    check (status in ('Identified', 'Reached Out', 'In Talks', 'Collaborated', 'Not a Fit')),
  notes text,
  last_contact_date date
);

create trigger trg_collaborators_updated_at
  before update on collaborators
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security, this is a private, single-user dashboard
-- (Section 1). Every table is locked down to logged-in requests only;
-- there's no per-row ownership model since there's exactly one user.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'journey_log', 'content_calendar', 'ideas', 'title_variants',
      'hook_variants', 'thumbnail_variants', 'weekly_reviews',
      'competitors', 'competitor_benchmarks', 'backup_log',
      'reference_videos', 'research_snapshots', 'daily_streaks',
      'service_alternative_checks', 'goals', 'collaborators'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "Authenticated access only" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
