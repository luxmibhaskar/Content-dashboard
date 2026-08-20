-- Platforms/Streak & Goals consolidation: platform_snapshots was
-- hardcoded to the 4 platforms the old Platforms modal offered
-- (Instagram/TikTok/Threads/Facebook). Goals support any platform,
-- freeform name (Streak & Goals redesign), and this table is now the
-- single source of truth for every platform goal's current count, not
-- just those 4, so the fixed CHECK constraint has to go. Written
-- without IF EXISTS on purpose, if the default-generated name assumed
-- here is wrong this should fail loudly, not silently leave the old
-- constraint in place rejecting custom platform names.
alter table platform_snapshots drop constraint platform_snapshots_platform_check;
