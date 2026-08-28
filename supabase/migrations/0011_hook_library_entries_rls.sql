-- hook_library_entries already existed live (created by an earlier,
-- unfinished attempt at this same feature) without Row Level Security
-- ever being enabled on it, unlike every other table in this app
-- (Section 1: single-user dashboard, "Authenticated access only" on
-- every table, see the RLS block at the end of 0001_init.sql). Verified
-- live: inserting through the app's normal (anon-key + session) client
-- failed with "new row violates row-level security policy" until this
-- ran. 0010_hook_library_entries.sql's own create table statement has
-- also been updated to include this from the start, for a from-scratch
-- setup; this migration is what actually fixes the already-existing
-- live table.
alter table hook_library_entries enable row level security;
drop policy if exists "Authenticated access only" on hook_library_entries;
create policy "Authenticated access only" on hook_library_entries
  for all to authenticated using (true) with check (true);
