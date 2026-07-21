-- Fix: guest (anon) viewing of a public tree stopped showing individuals once
-- visibility depended on individual_tree_memberships (migration 0017) instead of
-- individuals.family_tree_id alone. Two gaps, both scoped to public trees only so
-- FR-017 (never reveal a private-tree membership to guests) still holds:
--
-- 1. individuals_public_select (0009_public_tree_access.sql) still checked only the
--    individual's *original* family_tree_id — so a person added to a second, public
--    tree via membership never became visible to that tree's guests unless their
--    original tree also happened to be the public one.
-- 2. individual_tree_memberships had no anon policy at all — but that also blocks the
--    `individual_tree_memberships!inner(...)` embedded join getTreeGraph() needs just
--    to list a public tree's own members.

drop policy if exists individuals_public_select on public.individuals;

create policy individuals_public_select on public.individuals
  for select to anon
  using (
    exists (
      select 1 from public.individual_tree_memberships itm
      join public.family_trees ft on ft.id = itm.family_tree_id
      where itm.individual_id = individuals.id and ft.is_public
    )
  );

-- Anon may read a membership row only when that row's tree is public — never any
-- other (possibly private) tree the same person also belongs to.
create policy individual_tree_memberships_public_select on public.individual_tree_memberships
  for select to anon
  using (
    exists (
      select 1 from public.family_trees
      where family_trees.id = individual_tree_memberships.family_tree_id and family_trees.is_public
    )
  );
