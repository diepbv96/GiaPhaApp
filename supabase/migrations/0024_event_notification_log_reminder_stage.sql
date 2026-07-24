-- Adds a reminder_stage to event_notification_log so the same occurrence can be
-- reminded twice: once "advance" (days_before days ahead, existing behavior) and
-- once "due_today" (the day the event actually happens) — see logic.ts
-- computeDueReminders. The previous unique constraint assumed exactly one reminder
-- per (individual, event_type, event_year); it's replaced with one that also keys
-- on the stage so both sends are tracked and deduped independently.

create type reminder_stage as enum ('advance', 'due_today');

alter table public.event_notification_log
  add column reminder_stage reminder_stage not null default 'advance';

-- Drop the old 3-column unique constraint by its columns rather than its
-- (auto-generated, easy to get subtly wrong) name.
do $$
declare
  legacy_constraint text;
begin
  select tc.constraint_name into legacy_constraint
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'event_notification_log'
    and tc.constraint_type = 'UNIQUE'
  group by tc.constraint_name
  having array_agg(kcu.column_name order by kcu.column_name) = array['event_type', 'event_year', 'individual_id']
  limit 1;

  if legacy_constraint is not null then
    execute format('alter table public.event_notification_log drop constraint %I', legacy_constraint);
  end if;
end $$;

alter table public.event_notification_log
  add constraint event_notification_log_individual_event_year_stage_key
  unique (individual_id, event_type, event_year, reminder_stage);
