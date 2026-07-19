-- family_trees: at most 5 trees system-wide, at most one marked default (FR-016-FR-019)

create table public.family_trees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  is_default boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- FR-018: at most one default tree at a time.
create unique index family_trees_single_default
  on public.family_trees (is_default)
  where is_default;

-- FR-016/FR-017: block creating a 6th tree, system-wide.
create function public.enforce_family_tree_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.family_trees) >= 5 then
    raise exception 'FAMILY_TREE_LIMIT_REACHED: at most 5 family trees are allowed'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger family_trees_limit_check
  before insert on public.family_trees
  for each row execute function public.enforce_family_tree_limit();
