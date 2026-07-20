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
