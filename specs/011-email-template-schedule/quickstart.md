# Quickstart: Validating Templates & Configurable Send Time

Prerequisites: local Supabase stack running (`supabase start`), migrations applied through the new one for this feature, an Admin account (see `supabase/seed/seed.sql`), and the app running (`npm run dev`).

## 1. Migration applied correctly

```bash
supabase db push   # or: re-run `supabase start` after adding the migration locally
```

```sql
select daily_send_time from public.event_notification_config;
-- expect: 06:00:00

select jobname, schedule from cron.job
where jobname in ('send-event-reminders-daily', 'sync-event-reminder-schedule-daily');
-- expect two rows: '... 23 * * *' (or current effective schedule) and '0 17 * * *'
```

## 2. Predefined template picker + preview (User Story 1)

1. Sign in as Admin → sidebar → **Cấu hình thông báo**.
2. In the template picker, select each predefined option in turn.
3. For each, open the preview and confirm:
   - The birthday-sample rendering and the death-anniversary-sample rendering both read naturally (SC-002) — no leftover `{{...}}` tokens, no wording that's clearly birthday-only or death-anniversary-only outside the event-type word itself.
4. Edit the textarea after picking one; confirm the preview updates to match the edit (FR-005).
5. Save; reload the page; confirm the saved wording persisted (`select template from public.event_notification_config;`).

## 3. Configurable send time takes effect the next day, not immediately (User Story 2 / Clarifications)

1. Note the current schedule: `select schedule from cron.job where jobname = 'send-event-reminders-daily';`.
2. In the settings screen, change the send time to a new value (e.g. `20:00`) and save.
3. Confirm the config row updated immediately: `select daily_send_time from public.event_notification_config;` → `20:00:00`.
4. Confirm the **live schedule has not changed yet**: re-run the query from step 1 — same value as before.
5. Simulate the next Vietnam-midnight sync manually: `select public.sync_event_reminder_schedule();`.
6. Re-run the query from step 1 again — now expect `'0 13 * * *'` (20:00 ICT → 13:00 UTC).
7. Confirm no duplicate job was created: `select count(*) from cron.job where jobname = 'send-event-reminders-daily';` → `1`.

## 4. No double-send / no skipped reminder from a schedule change (FR-009)

1. With at least one individual due today (seed data or a manually inserted birthday), trigger the function manually twice in a row:
   ```bash
   curl -X POST 'http://127.0.0.1:54321/functions/v1/send-event-reminders' \
     -H "Authorization: Bearer <local-service-role-key>"
   ```
2. Confirm the second call reports `sent: 0` for the same occurrence (already in `event_notification_log`) regardless of the `daily_send_time` value at the time.

## 5. Setup guide is self-sufficient (User Story 3 / SC-004)

1. Open `docs/event-notification-setup.md` fresh (as if you had never read the code).
2. Follow it top to bottom on a project with notifications not yet enabled.
3. Confirm you reach a working, sending configuration — including picking a template and setting a send time via the Admin screen — using only that document, with no step requiring you to read source code.
