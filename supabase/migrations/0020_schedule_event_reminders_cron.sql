-- Schedules the daily send-event-reminders Edge Function run (see README.md
-- "Event-reminder emails") via pg_cron + pg_net, so the schedule lives in version
-- control instead of a manual Dashboard step.
--
-- Runs at 06:00 Asia/Ho_Chi_Minh (UTC+7) = 23:00 UTC the previous day. pg_cron
-- schedules always run in UTC, so "0 23 * * *" is the UTC-shifted equivalent of
-- 06:00 GMT+7 (the function itself separately computes "today" in UTC+7 — see
-- vietnamToday() in supabase/functions/send-event-reminders/index.ts).
--
-- Prerequisite (one-time, per project): create two Vault secrets holding the
-- values the Edge Function needs to be invoked over HTTP. Dashboard > Project
-- Settings > Vault > "Add new secret", or via SQL:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- (The service_role key, not anon — the function itself already uses
-- SUPABASE_SERVICE_ROLE_KEY internally to bypass RLS; this is a separate copy used
-- only to authenticate the HTTP call into the function.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'send-event-reminders-daily',
    '0 23 * * *',
    $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/send-event-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
    $$
  )
where not exists (select 1 from cron.job where jobname = 'send-event-reminders-daily');
