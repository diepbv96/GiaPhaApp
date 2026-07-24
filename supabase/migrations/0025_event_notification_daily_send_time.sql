-- Adds an Admin-configurable time-of-day for the daily event-reminder run
-- (spec 011-email-template-schedule FR-006/FR-007/FR-008, Clarifications
-- 2026-07-24: a change made during the day takes effect starting tomorrow, not
-- immediately). Rather than rescheduling the moment an Admin saves the setting,
-- a small daily job re-syncs the real pg_cron schedule to match the configured
-- value once per Vietnam calendar day (00:00 Asia/Ho_Chi_Minh = 17:00 UTC,
-- no DST) — see supabase/functions/send-event-reminders/index.ts vietnamToday()
-- for the same fixed-UTC+7 assumption elsewhere in this feature.

alter table public.event_notification_config
  add column daily_send_time time not null default '06:00:00';

create function public.sync_event_reminder_schedule()
returns void
language plpgsql
as $$
declare
  send_time time;
  utc_hour int;
  utc_minute int;
begin
  select daily_send_time into send_time
  from public.event_notification_config
  where id = '00000000-0000-0000-0000-000000000000';

  utc_hour := mod(extract(hour from send_time)::int - 7 + 24, 24);
  utc_minute := extract(minute from send_time)::int;

  perform cron.schedule(
    'send-event-reminders-daily',
    utc_minute || ' ' || utc_hour || ' * * *',
    $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-event-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
    $job$
  );
end;
$$;

-- Once per Vietnam calendar day, re-syncs the real send job's schedule from
-- whatever's currently configured — never triggered by the Admin's save action
-- itself, which is what makes "applies from tomorrow" hold with no extra
-- comparison logic (research.md §3).
select
  cron.schedule(
    'sync-event-reminder-schedule-daily',
    '0 17 * * *',
    $$select public.sync_event_reminder_schedule();$$
  )
where not exists (select 1 from cron.job where jobname = 'sync-event-reminder-schedule-daily');
