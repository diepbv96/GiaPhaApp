-- Spec 009 (cross-tree-relationships): relationships_public_select had the same bug
-- individuals_public_select was fixed for in 0019_public_tree_membership_visibility.sql —
-- it gated guest (anon) visibility on relationships.family_tree_id (the tree the
-- relationship happened to be recorded in) instead of current tree membership. So a
-- guest viewing a public tree could see fewer relationships than an authenticated
-- viewer of the exact same tree, once two people's relationship followed them into a
-- second tree via individual_tree_memberships but the relationship row itself still
-- pointed at the first tree.
--
-- Fix: a relationship is visible to anon whenever there exists some public family tree
-- where both person_a_id and person_b_id are members — mirroring the join shape
-- individual_tree_memberships_public_select already uses.

drop policy if exists relationships_public_select on public.relationships;

create policy relationships_public_select on public.relationships
  for select to anon
  using (
    exists (
      select 1
      from public.individual_tree_memberships a
      join public.individual_tree_memberships b on a.family_tree_id = b.family_tree_id
      join public.family_trees ft on ft.id = a.family_tree_id
      where a.individual_id = relationships.person_a_id
        and b.individual_id = relationships.person_b_id
        and ft.is_public
    )
  );
