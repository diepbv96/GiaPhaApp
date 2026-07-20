-- Family tree slugs (data-model.md "family_trees (existing table, extended)") —
-- spec FR-014/FR-015/FR-019: unique, URL-safe, auto-generated from name, admin-editable,
-- and every pre-existing tree gets one during this migration with no manual step.

create extension if not exists unaccent with schema extensions;

-- Lowercases, strips diacritics (incl. Vietnamese "đ", which `unaccent` alone does not
-- touch since it's a distinct Latin letter, not a combining-mark accented vowel), and
-- collapses everything else into hyphens. See contracts/tree-slug-routing.md.
create function public.slugify_tree_name(input text)
returns text
language sql
immutable
as $$
  select trim(
    both '-' from
    regexp_replace(extensions.unaccent(replace(lower(input), 'đ', 'd')), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- Appends the next available numeric suffix (-2, -3, ...) on a collision, so callers
-- never have to retry themselves at the database level (spec Assumptions).
create function public.generate_unique_tree_slug(tree_name text, exclude_id uuid default null)
returns text
language plpgsql
as $$
declare
  base_slug text := public.slugify_tree_name(tree_name);
  candidate text;
  suffix int := 1;
begin
  if base_slug = '' then
    base_slug := 'cay-gia-pha';
  end if;
  candidate := base_slug;

  while exists (
    select 1 from public.family_trees
    where slug = candidate and (exclude_id is null or id <> exclude_id)
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  return candidate;
end;
$$;

alter table public.family_trees add column slug text;

-- Backfill: one deterministic pass, oldest tree first, so collisions between
-- existing trees resolve the same way every time this migration is (re-)applied.
do $$
declare
  r record;
begin
  for r in select id, name from public.family_trees order by created_at loop
    update public.family_trees
    set slug = public.generate_unique_tree_slug(r.name, r.id)
    where id = r.id;
  end loop;
end $$;

alter table public.family_trees
  alter column slug set not null,
  add constraint family_trees_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint family_trees_slug_unique unique (slug);

-- Safety net for any insert path that doesn't supply a slug itself (spec FR-014):
-- the client is expected to generate + retry-on-conflict (contracts/tree-slug-routing.md),
-- but a tree can never end up without one even if that step is skipped.
create function public.set_family_tree_slug_default()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.generate_unique_tree_slug(new.name, new.id);
  end if;
  return new;
end;
$$;

create trigger family_trees_slug_default
  before insert on public.family_trees
  for each row execute function public.set_family_tree_slug_default();

-- No new RLS policy needed: `slug` is just another column on `family_trees`, already
-- covered by the existing admin-only write / any-authenticated-or-public-guest read
-- policies from 0007_rls_policies.sql and 0009_public_tree_access.sql.
