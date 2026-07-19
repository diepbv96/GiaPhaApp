-- Adds:
-- 1. is_deceased: explicit living/deceased flag so the UI can hide "Ngày mất" for
--    people who are still alive instead of inferring it from an empty death_date
--    (an empty death_date already meant "unknown date", not "still alive").
-- 2. layout_x/layout_y: optional manual node position, set when an Admin/Editor
--    drags a node in the tree canvas. Null means "use the computed layout".

alter table public.individuals
  add column is_deceased boolean not null default false,
  add column layout_x double precision,
  add column layout_y double precision;

-- Backfill: any individual with a recorded death date must already be deceased.
update public.individuals set is_deceased = true where death_date is not null;
