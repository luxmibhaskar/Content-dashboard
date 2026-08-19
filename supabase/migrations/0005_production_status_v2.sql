-- Section 19 update: replace the 6-stage production_status taxonomy
-- (Idea, Scripting, Filming, Editing, Scheduled, Published) with a
-- 4-stage one (Ready to Record / Scripted, Recorded, Editing,
-- Published / Scheduled). Null is now a valid, meaningful state: items
-- still being scoped in the Idea Panel/Scout flow have no production
-- status at all until "Transfer to Calendar" assigns their first real
-- one, and null items intentionally don't render as Calendar cards.
--
-- Data migration mapping (confirmed with the user before running):
--   Idea, Scripting   -> null (draft/in-progress, not force-promoted to
--                        looking "ready to record")
--   Filming           -> Recorded
--   Editing           -> Editing (unchanged)
--   Scheduled, Published -> Published / Scheduled

alter table content_calendar
  drop constraint if exists content_calendar_production_status_check;

alter table content_calendar
  alter column production_status drop not null,
  alter column production_status drop default;

update content_calendar set production_status = null
  where production_status in ('Idea', 'Scripting');

update content_calendar set production_status = 'Recorded'
  where production_status = 'Filming';

update content_calendar set production_status = 'Published / Scheduled'
  where production_status in ('Scheduled', 'Published');

alter table content_calendar
  add constraint content_calendar_production_status_check
    check (
      production_status is null
      or production_status in (
        'Ready to Record / Scripted', 'Recorded', 'Editing', 'Published / Scheduled'
      )
    );
