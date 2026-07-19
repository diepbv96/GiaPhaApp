-- sibling_order: an explicit, manually-entered ordinal among siblings, following the
-- Vietnamese naming convention where the eldest child is called "thứ Hai" (2), then
-- 3, 4, 5, ... (no "thứ Nhất"). Deliberately NOT derived from birth_date: many recorded
-- individuals have no birth date at all, and a family's traditional ordinal for someone
-- doesn't always line up with the exact recorded date even when one exists. Nullable —
-- most individuals (only children, or ones nobody has entered this for yet) leave it unset.

alter table public.individuals
  add column sibling_order integer;
