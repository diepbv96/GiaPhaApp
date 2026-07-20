-- ==========================================================================
-- Gia Pha (Bui Family Tree) — one-shot bootstrap for the Supabase SQL Editor
-- ==========================================================================
--
-- Use this INSTEAD of the Supabase CLI (supabase db push) if you'd rather just
-- paste one script into Dashboard > SQL Editor > New query on a brand-new
-- Supabase project. It is the concatenation of everything in
-- supabase/migrations/0001..0015 (schema, constraints, triggers, RLS policies,
-- the avatars storage bucket, family tree slugs, event-reminder config/log) followed
-- by a single editable Admin account.
--
-- >>> BEFORE RUNNING: scroll to the bottom "Admin user" section and change
-- >>> the email/password there. Do not run this twice against the same
-- >>> project — it is NOT idempotent (matches the migrations it's copied
-- >>> from); re-running will error on already-existing types/tables/policies.
--
-- If you *do* have the Supabase CLI, prefer `supabase db push` against
-- supabase/migrations/ instead and use this file only for the Admin block.

-- pgcrypto provides gen_random_uuid() and crypt()/gen_salt() (used below for the
-- Admin password hash). Supabase projects normally have it enabled already; this
-- is just a defensive no-op guard for a truly bare project.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0001_enums.sql
-- ---------------------------------------------------------------------------
-- Enumerations shared across the gia pha schema (data-model.md "Enumerations")

create type person_gender as enum ('male', 'female', 'unknown');
create type date_precision as enum ('day', 'month', 'year', 'unknown');
create type relationship_type as enum ('parent_child', 'spouse', 'sibling');
create type user_role as enum ('admin', 'editor', 'viewer');
create type import_row_status as enum ('succeeded', 'failed', 'duplicate');

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0002_profiles.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0003_family_trees.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0004_individuals.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0005_relationships.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0006_import_batches.sql
-- ---------------------------------------------------------------------------
-- import_batches / import_row_results: bulk .xlsx import bookkeeping (FR-013-FR-015, FR-025)

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  family_tree_id uuid not null references public.family_trees (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  file_name text,
  total_rows integer not null default 0,
  succeeded_rows integer not null default 0,
  failed_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.import_row_results (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches (id) on delete cascade,
  row_number integer not null,
  status import_row_status not null,
  error_message text,
  individual_id uuid references public.individuals (id)
);

create index import_row_results_batch_id_idx on public.import_row_results (import_batch_id);

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0007_rls_policies.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0008_family_tree_functions.sql
-- ---------------------------------------------------------------------------
-- set_default_family_tree: atomically unmark the current default and mark a new one
-- (FR-018). Two separate UPDATE statements from the client could momentarily violate
-- the "at most one default" unique index under concurrent admins; doing both updates
-- inside a single function call keeps it a single transaction.

create function public.set_default_family_tree(target_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if not exists (select 1 from public.family_trees where id = target_id) then
    raise exception 'FAMILY_TREE_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.family_trees set is_default = false where is_default and id <> target_id;
  update public.family_trees set is_default = true where id = target_id;
end;
$$;

revoke all on function public.set_default_family_tree(uuid) from public;
grant execute on function public.set_default_family_tree(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0009_public_tree_access.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0010_avatar_storage.sql
-- ---------------------------------------------------------------------------
-- Storage bucket for individual avatar photos (FR-008). Made public-read: with guest
-- viewing of published trees now supported (0009_public_tree_access.sql), avatar
-- images need to be readable without an authenticated session too. Object paths are
-- namespaced by individual id + upload timestamp, so this is a reasonable tradeoff —
-- readable only to someone who already has the photo's exact object path from the
-- app, not enumerable or listable by a stranger. Writes remain restricted to
-- Admin/Editor via the storage.objects policies below.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_admin_editor_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]));

create policy avatars_admin_editor_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]))
  with check (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]));

create policy avatars_admin_editor_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.current_role_is(array['admin', 'editor']::user_role[]));

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0011_individual_lifecycle_and_layout.sql
-- ---------------------------------------------------------------------------
-- Adds:
-- 1. is_deceased: explicit living/deceased flag so the UI can hide "Ngày mất" for
--    people who are still alive instead of inferring it from an empty death_date
--    (an empty death_date already meant "unknown date", not "still alive").
-- 2. layout_x/layout_y: optional manual node position, set when an Admin/Editor
--    drags a node in the tree canvas. Null means "use the computed layout".

alter table public.individuals
  add column is_deceased boolean not null default false,
  add column layout_x double precision,
  add column layout_y double precision;

update public.individuals set is_deceased = true where death_date is not null;

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0012_individual_sibling_order.sql
-- ---------------------------------------------------------------------------
-- sibling_order: an explicit, manually-entered ordinal among siblings, following the
-- Vietnamese naming convention where the eldest child is called "thứ Hai" (2), then
-- 3, 4, 5, ... (no "thứ Nhất"). Deliberately NOT derived from birth_date: many recorded
-- individuals have no birth date at all, and a family's traditional ordinal for someone
-- doesn't always line up with the exact recorded date even when one exists. Nullable —
-- most individuals (only children, or ones nobody has entered this for yet) leave it unset.

alter table public.individuals
  add column sibling_order integer;


-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0013_family_tree_slug.sql
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0014_event_notification_config.sql
-- ---------------------------------------------------------------------------
-- Event notification configuration (data-model.md "event_notification_config" /
-- "family_tree_notification_recipients"). A single, application-wide settings row
-- (template, days-before, default recipients) plus an optional per-tree recipient
-- override — spec FR-009–FR-011b, Clarifications 2026-07-20.

create table public.event_notification_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000000',
  enabled boolean not null default false,
  template text not null default '',
  days_before integer not null default 7 check (days_before >= 0),
  default_recipients text[] not null default '{}',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  -- Fixed id + primary key together guarantee exactly one row ever exists (a true
  -- singleton) without needing a separate partial-unique-index trick.
  constraint event_notification_config_is_singleton check (id = '00000000-0000-0000-0000-000000000000')
);

insert into public.event_notification_config (id) values ('00000000-0000-0000-0000-000000000000');

create table public.family_tree_notification_recipients (
  family_tree_id uuid primary key references public.family_trees (id) on delete cascade,
  recipients text[] not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.event_notification_config enable row level security;
alter table public.family_tree_notification_recipients enable row level security;

-- Admin-only in both directions: these settings control outgoing email and, via
-- default_recipients/recipients, contain other people's email addresses — never
-- exposed to editor/viewer/anon (data-model.md RLS table).
create policy event_notification_config_admin_only on public.event_notification_config
  for all to authenticated
  using (public.current_role_is(array['admin']::user_role[]))
  with check (public.current_role_is(array['admin']::user_role[]));

create policy family_tree_notification_recipients_admin_only on public.family_tree_notification_recipients
  for all to authenticated
  using (public.current_role_is(array['admin']::user_role[]))
  with check (public.current_role_is(array['admin']::user_role[]));

-- ---------------------------------------------------------------------------
-- source: supabase/migrations/0015_event_notification_log.sql
-- ---------------------------------------------------------------------------
-- Send-once guarantee for the reminder Edge Function (data-model.md
-- "event_notification_log") — spec FR-013: never send a duplicate reminder for the
-- same event occurrence.

create type life_event_type as enum ('birthday', 'death_anniversary');

create table public.event_notification_log (
  id uuid primary key default gen_random_uuid(),
  individual_id uuid not null references public.individuals (id) on delete cascade,
  event_type life_event_type not null,
  event_year integer not null,
  sent_at timestamptz not null default now(),
  -- The dedupe check the Edge Function relies on before sending (contracts/event-notification-config.md).
  unique (individual_id, event_type, event_year)
);

alter table public.event_notification_log enable row level security;

-- Admin may view send history; nobody (not even Admin) writes via the client API —
-- only the Edge Function does, using the service-role key, which bypasses RLS.
create policy event_notification_log_admin_select on public.event_notification_log
  for select to authenticated
  using (public.current_role_is(array['admin']::user_role[]));

-- =============================================================================
-- Admin user — EDIT the email/password below before running this file
-- =============================================================================
--
-- Creates exactly one signed-in account with role = 'admin' (FR-009/FR-020).
-- The on_auth_user_created trigger (see the 0002_profiles.sql section above)
-- auto-creates the matching `profiles` row with the default role 'viewer';
-- this block promotes that row to 'admin' right after.
--
-- Sign in with this account once the app is deployed, then use
-- "Quan ly cay gia pha" to create your first family tree, and invite
-- Editor/Viewer accounts (or publish a tree for guest viewing) from there.

do $$
declare
  v_admin_id uuid := gen_random_uuid();

  -- >>> EDIT THESE TWO VALUES BEFORE RUNNING <<<
  v_admin_email text := 'admin@example.com';
  v_admin_password text := 'ChangeThisPassword123!';
  v_admin_display_name text := 'Quản trị viên';
begin
  -- The confirmation_token/recovery_token/email_change*/phone_change*/
  -- reauthentication_token columns are set to '' (not left NULL) below: GoTrue's Go
  -- code scans them as plain strings, so a NULL there breaks every query touching
  -- this user — including login — with a generic "Database error querying schema"
  -- (see supabase/reset-admin-password.sql if you hit this on an existing account).
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_admin_email, crypt(v_admin_password, gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('display_name', v_admin_display_name),
    '', '', '', '', '', '', '', ''
  );

  -- Email/password sign-in also needs a matching auth.identities row — without it
  -- you can get "Invalid login credentials" even with the exact right password
  -- (see supabase/reset-admin-password.sql if you hit this on an existing account).
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_admin_id::text, v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email),
    'email', now(), now(), now()
  );

  update public.profiles set role = 'admin' where id = v_admin_id;
end $$;
