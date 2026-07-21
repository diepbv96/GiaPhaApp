-- individual_tree_memberships: which family tree(s) a person belongs to (spec 006
-- FR-004-FR-008). Becomes the sole authority for "who's in this tree" — individuals.
-- family_tree_id is kept (unchanged shape) but now only means "the tree this person
-- was originally created in"; it seeds this table's first row per individual below.

create table public.individual_tree_memberships (
  individual_id uuid not null references public.individuals (id) on delete cascade,
  family_tree_id uuid not null references public.family_trees (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (individual_id, family_tree_id)
);

create index individual_tree_memberships_tree_idx on public.individual_tree_memberships (family_tree_id);

-- Backfill: every existing individual's current tree becomes their first membership.
insert into public.individual_tree_memberships (individual_id, family_tree_id, created_at)
select id, family_tree_id, created_at from public.individuals;

-- Every future individuals insert (including bulk import) auto-seeds its own
-- membership row — no other insert path needs to change.
create function public.seed_individual_primary_tree_membership()
returns trigger
language plpgsql
as $$
begin
  insert into public.individual_tree_memberships (individual_id, family_tree_id)
  values (new.id, new.family_tree_id);
  return new;
end;
$$;

create trigger individuals_seed_tree_membership
  after insert on public.individuals
  for each row execute function public.seed_individual_primary_tree_membership();

-- FR-007: never let a person end up with zero family trees.
create function public.enforce_last_tree_membership()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.individual_tree_memberships where individual_id = old.individual_id) <= 1 then
    raise exception 'LAST_TREE_MEMBERSHIP: cannot remove a person''s only remaining family tree'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger individual_tree_memberships_last_check
  before delete on public.individual_tree_memberships
  for each row execute function public.enforce_last_tree_membership();

-- Edge Cases (spec.md): a membership can't be removed while relationships still tie
-- this person to this specific tree — the caller must delete those relationships
-- first (or pass cascadeRelationships to delete them as part of the same action).
-- Without this, deleting a membership row would silently leave "dangling"
-- relationships whose family_tree_id no longer matches either endpoint's membership.
create function public.enforce_no_relationships_before_membership_removal()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.relationships
    where family_tree_id = old.family_tree_id
      and (person_a_id = old.individual_id or person_b_id = old.individual_id)
  ) then
    raise exception 'MEMBERSHIP_HAS_RELATIONSHIPS: cannot remove a tree membership while relationships in that tree still reference this person'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger individual_tree_memberships_relationship_check
  before delete on public.individual_tree_memberships
  for each row execute function public.enforce_no_relationships_before_membership_removal();

-- FR-013: rewritten to check membership instead of individuals.family_tree_id, so the
-- same-tree rule keeps holding once a person can belong to more than one tree.
create or replace function public.enforce_relationship_same_tree()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.individual_tree_memberships
    where individual_id = new.person_a_id and family_tree_id = new.family_tree_id
  ) or not exists (
    select 1 from public.individual_tree_memberships
    where individual_id = new.person_b_id and family_tree_id = new.family_tree_id
  ) then
    raise exception 'RELATIONSHIP_TREE_MISMATCH: both individuals must belong to the relationship''s family tree'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

alter table public.individual_tree_memberships enable row level security;

create policy individual_tree_memberships_select on public.individual_tree_memberships
  for select using (public.has_profile());

create policy individual_tree_memberships_admin_editor_insert on public.individual_tree_memberships
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));

create policy individual_tree_memberships_admin_editor_delete on public.individual_tree_memberships
  for delete to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]));

-- Deliberately no `anon` policy: default-deny keeps other-tree membership invisible
-- to public/guest viewers (FR-017, SC-006).
