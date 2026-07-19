-- Row Level Security: the authoritative enforcement of Admin/Editor/Viewer permissions
-- (data-model.md "Row Level Security (authorization contract)"). The frontend also hides
-- controls per role for UX, but this is what actually blocks a bypassed client (FR-010,
-- FR-011, FR-020, FR-024).

create function public.current_role_is(required_roles user_role[])
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any (required_roles)
  );
$$;

create function public.has_profile()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.family_trees enable row level security;
alter table public.individuals enable row level security;
alter table public.relationships enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_row_results enable row level security;

-- profiles: a user reads their own row; admins read/manage all; only admins change role.
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.current_role_is(array['admin']::user_role[]));

create policy profiles_update_self_display_name on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy profiles_admin_manage on public.profiles
  for all using (public.current_role_is(array['admin']::user_role[]))
  with check (public.current_role_is(array['admin']::user_role[]));

-- family_trees: any signed-in user with a profile can read (FR-024); only admin writes (FR-020).
create policy family_trees_select on public.family_trees
  for select using (public.has_profile());

create policy family_trees_admin_write on public.family_trees
  for insert to authenticated
  with check (public.current_role_is(array['admin']::user_role[]));

create policy family_trees_admin_update on public.family_trees
  for update to authenticated
  using (public.current_role_is(array['admin']::user_role[]))
  with check (public.current_role_is(array['admin']::user_role[]));

create policy family_trees_admin_delete on public.family_trees
  for delete to authenticated
  using (public.current_role_is(array['admin']::user_role[]));

-- individuals: any signed-in user reads (FR-024); admin/editor write (FR-010, FR-011).
create policy individuals_select on public.individuals
  for select using (public.has_profile());

create policy individuals_admin_editor_insert on public.individuals
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));

create policy individuals_admin_editor_update on public.individuals
  for update to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]))
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));

create policy individuals_admin_editor_delete on public.individuals
  for delete to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]));

-- relationships: same rule as individuals.
create policy relationships_select on public.relationships
  for select using (public.has_profile());

create policy relationships_admin_editor_insert on public.relationships
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));

create policy relationships_admin_editor_delete on public.relationships
  for delete to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]));

-- import_batches / import_row_results: admin/editor can create imports; anyone with a
-- profile can read the resulting summary for a tree they can already see.
create policy import_batches_select on public.import_batches
  for select using (public.has_profile());

create policy import_batches_admin_editor_insert on public.import_batches
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));

create policy import_row_results_select on public.import_row_results
  for select using (public.has_profile());

create policy import_row_results_admin_editor_insert on public.import_row_results
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));
