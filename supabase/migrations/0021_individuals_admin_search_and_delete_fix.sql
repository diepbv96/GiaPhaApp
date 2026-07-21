-- Spec 007 (individuals-admin-dashboard):
-- (a) diacritic-tolerant, case-insensitive search columns for the admin dashboard's
--     name/alias search (FR-004), reusing the unaccent-based normalization idiom
--     already established by 0013_family_tree_slug.sql's slugify_tree_name();
-- (b) a one-line fix to 0017_individual_tree_memberships.sql's
--     enforce_last_tree_membership() trigger function so deleting an individual who
--     belongs to more than one family tree (spec 007 FR-010, full delete everywhere)
--     doesn't get spuriously rejected by that guard mid-cascade (research.md §4).

-- extensions.unaccent() is declared STABLE, not IMMUTABLE, so Postgres rejects it
-- directly inside a generated column's expression (42P17: "generation expression is
-- not immutable") even though 0013_family_tree_slug.sql's slugify_tree_name() already
-- wraps the exact same call and declares itself immutable — Postgres trusts an
-- explicit `immutable` function declaration without re-checking what it calls, but a
-- generated column's expression has no such wrapper to trust. Fix: give it one.
create function public.normalize_search_text(input text)
returns text
language sql
immutable
as $$
  select extensions.unaccent(replace(lower(coalesce(input, '')), 'đ', 'd'));
$$;

alter table public.individuals
  add column full_name_normalized text
    generated always as (public.normalize_search_text(full_name)) stored,
  add column alias_normalized text
    generated always as (public.normalize_search_text(alias)) stored;

create index individuals_full_name_normalized_idx on public.individuals (full_name_normalized);
create index individuals_alias_normalized_idx on public.individuals (alias_normalized);

-- The guard's count(*) check only makes sense while the individual itself still
-- exists (the standalone "remove from just this tree" flow, treeMembershipService's
-- removeIndividualFromTree). When the individual row itself is being deleted in the
-- same statement/transaction (deleteIndividual's cascade via individuals' FK), ending
-- up with zero memberships is correct, not an error — the person is gone entirely.
create or replace function public.enforce_last_tree_membership()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.individuals where id = old.individual_id) then
    return old;
  end if;

  if (select count(*) from public.individual_tree_memberships where individual_id = old.individual_id) <= 1 then
    raise exception 'LAST_TREE_MEMBERSHIP: cannot remove a person''s only remaining family tree'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;
