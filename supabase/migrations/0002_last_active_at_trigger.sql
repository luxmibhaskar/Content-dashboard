-- ---------------------------------------------------------------------
-- Section 17.4: Hot/Cold Archiving. last_active_at drives the 7-day
-- archive countdown, "set to publish_date initially" (spec's own
-- wording), then bumped to now() on each retrieval by app code. A
-- trigger centralizes the initial-set step so it holds regardless of
-- which code path first flips production_status to 'Published', rather
-- than relying on every future write path to remember it.
-- ---------------------------------------------------------------------
create or replace function set_last_active_at_on_publish()
returns trigger as $$
begin
  if new.production_status = 'Published' and new.last_active_at is null then
    new.last_active_at := coalesce(new.publish_date, now());
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_content_calendar_last_active_at
  before insert or update on content_calendar
  for each row execute function set_last_active_at_on_publish();
