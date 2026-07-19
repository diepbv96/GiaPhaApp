-- relationships: parent_child / spouse / sibling links between two individuals (FR-002)

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  family_tree_id uuid not null references public.family_trees (id) on delete cascade,
  type relationship_type not null,
  person_a_id uuid not null references public.individuals (id) on delete restrict,
  person_b_id uuid not null references public.individuals (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint relationships_distinct_people check (person_a_id <> person_b_id),
  constraint relationships_unique_edge unique (type, person_a_id, person_b_id)
);

create index relationships_family_tree_id_idx on public.relationships (family_tree_id);
create index relationships_person_a_idx on public.relationships (person_a_id);
create index relationships_person_b_idx on public.relationships (person_b_id);

-- Both endpoints must belong to the same tree as the relationship row itself.
create function public.enforce_relationship_same_tree()
returns trigger
language plpgsql
as $$
declare
  a_tree uuid;
  b_tree uuid;
begin
  select family_tree_id into a_tree from public.individuals where id = new.person_a_id;
  select family_tree_id into b_tree from public.individuals where id = new.person_b_id;

  if a_tree is distinct from new.family_tree_id or b_tree is distinct from new.family_tree_id then
    raise exception 'RELATIONSHIP_TREE_MISMATCH: both individuals must belong to the relationship''s family tree'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger relationships_same_tree_check
  before insert or update on public.relationships
  for each row execute function public.enforce_relationship_same_tree();
