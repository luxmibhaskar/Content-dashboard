-- Per-item freeform notes on the topic page, one separate list per
-- content_calendar row (docs/topic-page-redesign.md, Notes section).
-- Sits in a right-hand column alongside the Manual/AI Research ->
-- Packaging -> Scripting phases, not part of any one phase: a note is
-- scoped to the content item itself.
--
-- Full schema now (CLAUDE.md's "build full schemas upfront" rule).
-- brand is carried redundantly with content_id, same as reference_videos
-- and manual_workflow_phases, so every core table stays brand-scoped.
create table content_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,

  -- Optional: a note can be saved with body text and no title. The UI
  -- falls back to a snippet of the content, then "Untitled note", for
  -- the collapsed summary line.
  title text,
  -- Freeform body, typed or pasted. Always a string (never null) so the
  -- client type stays plain `string`.
  content text not null default ''
);

-- Newest first is ordered by updated_at, and this trigger bumps it on
-- every edit (a title-only edit included), so "most recently created or
-- edited at the top" needs just the one ordering key.
create trigger trg_content_notes_updated_at
  before update on content_notes
  for each row execute function set_updated_at();

create index idx_content_notes_content_id on content_notes (content_id);

alter table content_notes enable row level security;
create policy "Authenticated access only" on content_notes
  for all to authenticated using (true) with check (true);
