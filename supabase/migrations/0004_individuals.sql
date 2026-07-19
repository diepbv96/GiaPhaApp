-- individuals: one person recorded in a family tree (data-model.md "individuals")

create table public.individuals (
  id uuid primary key default gen_random_uuid(),
  family_tree_id uuid not null references public.family_trees (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) > 0), -- FR-005
  alias text,
  gender person_gender not null, -- FR-005
  birth_date date,
  birth_date_precision date_precision,
  death_date date,
  death_date_precision date_precision,
  notes varchar(100), -- FR-007, DB-enforced backstop for the 100-char limit
  avatar_path text, -- Supabase Storage object path in the "avatars" bucket; at most one (FR-008)
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index individuals_family_tree_id_idx on public.individuals (family_tree_id);

-- Speeds up the exact full-name + date-of-birth duplicate check (FR-025).
create index individuals_duplicate_lookup_idx
  on public.individuals (family_tree_id, full_name, birth_date);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger individuals_set_updated_at
  before update on public.individuals
  for each row execute function public.set_updated_at();
