-- Guest (unauthenticated) viewing of a published family tree.
--
-- Rationale: most family members only ever need to *view* the tree; requiring every
-- relative to create an account was unnecessary friction. Admin can now mark the
-- default tree "public" so unauthenticated guests can view it on the home page,
-- while non-public trees still require sign-in for all three roles as before.

alter table public.family_trees
  add column is_public boolean not null default false;

-- Admin's existing UPDATE policy (family_trees_admin_update) already covers toggling
-- this column — no new write policy needed.

-- anon (unauthenticated) read access, scoped strictly to public trees.
create policy family_trees_public_select on public.family_trees
  for select to anon
  using (is_public);

create policy individuals_public_select on public.individuals
  for select to anon
  using (
    exists (
      select 1 from public.family_trees
      where family_trees.id = individuals.family_tree_id and family_trees.is_public
    )
  );

create policy relationships_public_select on public.relationships
  for select to anon
  using (
    exists (
      select 1 from public.family_trees
      where family_trees.id = relationships.family_tree_id and family_trees.is_public
    )
  );

-- Guests never get write access: no insert/update/delete policies are added for `anon`
-- on any table, so those statements fall through to Postgres's default-deny.
