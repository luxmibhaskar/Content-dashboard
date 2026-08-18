-- ---------------------------------------------------------------------
-- Section 10.1.4, restructured: platform_publishing goes from one flat
-- field set per platform to two parallel modes (viewer_pov / normal_pov)
-- per platform. jsonb has no fixed schema so no column change is
-- needed, but any real data already entered under the old flat shape
-- (platform_title/platform_description/platform_tags_hashtags/
-- platform_angle_line) needs reshaping, not silent loss. Old values
-- land in normal_pov (the plain, non-algorithm-framed version, the
-- closer match for whatever was typed in free-form before this split
-- existed); viewer_pov starts empty, ready for Run Research to fill in.
-- Idempotent: only touches rows that still have the old flat shape, a
-- second run against already-migrated or empty data is a no-op.
-- ---------------------------------------------------------------------
update content_calendar
set platform_publishing = (
  select coalesce(
    jsonb_object_agg(
      key,
      jsonb_build_object(
        'viewer_pov', '{}'::jsonb,
        'normal_pov', jsonb_build_object(
          'title', value -> 'platform_title',
          'description', value -> 'platform_description',
          'short_keywords', value -> 'platform_tags_hashtags',
          'angle_line', value -> 'platform_angle_line'
        )
      )
    ),
    '{}'::jsonb
  )
  from jsonb_each(platform_publishing)
)
where platform_publishing is not null
  and platform_publishing != '{}'::jsonb
  and exists (
    select 1 from jsonb_each(platform_publishing) e
    where e.value ? 'platform_title'
       or e.value ? 'platform_description'
       or e.value ? 'platform_tags_hashtags'
       or e.value ? 'platform_angle_line'
  );
