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
