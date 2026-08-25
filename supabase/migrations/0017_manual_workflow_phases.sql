-- docs/manual-workflow-redesign.md: the Manual side's three-phase
-- Research -> Packaging -> Scripting workflow, replacing the simpler
-- two-part Manual structure that used to live inside Research & Copy
-- and Scripts (research_copy_versions/scripts_versions, source='manual').
-- One row per (content_id, phase), not a version-history table: like
-- research_copy_versions/scripts_versions, "re-pasting overwrites" still
-- holds, just per-phase instead of per-tab. Full schema now (CLAUDE.md's
-- "build full schemas upfront" standing rule) even though the build
-- itself is phased: raw_pasted_text/parsed_data/status stay unpopulated
-- until each phase's own paste-import and parsing lands (Phase B/C/D of
-- the redesign), the gating logic (Phase A) only needs to know whether a
-- row's parsed_data is set.
create type manual_workflow_phase_type as enum ('research', 'packaging', 'scripting');
create type manual_workflow_status_type as enum ('approved', 'needs_revision', 'rejected');

create table manual_workflow_phases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  brand brand_type not null,

  content_id uuid not null references content_calendar(id) on delete cascade,
  phase manual_workflow_phase_type not null,

  -- The exact pasted block, kept even after successful parsing (not just
  -- on the paste-import fallback path): source of truth for "re-parse
  -- this" and for the raw-text fallback view itself when a paste can't
  -- be confidently matched (docs/manual-workflow-redesign.md's Fallback
  -- behavior section).
  raw_pasted_text text,
  -- Phase-specific parsed shape (ResearchPhaseData / PackagingPhaseData /
  -- ScriptingPhaseData, defined alongside each phase's own parser), a
  -- single jsonb column rather than one per phase since exactly one of
  -- the three ever applies to a given row (phase already says which).
  parsed_data jsonb,
  -- The template's own end-of-phase line (APPROVED / NEEDS REVISION /
  -- REJECTED), Research and Scripting return this explicitly; Packaging's
  -- own template has no equivalent field (approval there happens by the
  -- user typing the next-phase instruction, not a parsed status), so
  -- this stays null on packaging rows.
  status manual_workflow_status_type,

  unique (content_id, phase)
);

create trigger trg_manual_workflow_phases_updated_at
  before update on manual_workflow_phases
  for each row execute function set_updated_at();

create index idx_manual_workflow_phases_content_id on manual_workflow_phases (content_id);

alter table manual_workflow_phases enable row level security;
create policy "Authenticated access only" on manual_workflow_phases
  for all to authenticated using (true) with check (true);
