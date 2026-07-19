-- profiles: one row per auth.users id, holds the app role (data-model.md "profiles")
-- FR-009: three roles (admin, editor, viewer). New sign-ins default to 'viewer';
-- an admin must explicitly promote an account to editor/admin (see 0007_rls_policies.sql).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new Supabase Auth user is created,
-- so every signed-in user always has exactly one role (FR-009, FR-024).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, new.raw_user_meta_data ->> 'display_name', 'viewer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
