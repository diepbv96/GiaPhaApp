# Setting up event-reminder emails

This guide covers everything needed to turn on and configure automatic birthday/death-anniversary reminder emails, end to end. It assumes you already have the app running locally and a Supabase project linked (see the root `README.md` for that general setup) — this starts from there.

## 1. Create a transactional email provider account

1. Sign up at [resend.com](https://resend.com).
2. Verify a sending domain (or use Resend's test domain while getting started).
3. Create an API key from the Resend dashboard.

Keep the API key handy for step 3 below — without it, reminder emails are computed and logged but never actually sent (safe to set everything else up first).

## 2. Deploy the Edge Function

Deploying the function and applying migrations to the live project both happen
automatically via `.github/workflows/supabase-deploy.yml` on every merge to
`main` that touches `supabase/functions/**` or `supabase/migrations/**` — see
`specs/012-supabase-deploy-workflow/` — so there is no `supabase functions
deploy` or `supabase db push` command to run by hand here. That workflow needs
three one-time repository secrets (`SUPABASE_ACCESS_TOKEN`,
`SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` — Settings → Secrets and
variables → Actions); see that workflow's own documentation for details.

Still set the function's own secrets once per project — copy
`supabase/functions/send-event-reminders/.env.example` to a local `.env`
first, fill in real values, and run:

```bash
supabase secrets set --env-file supabase/functions/send-event-reminders/.env
```

- `RESEND_API_KEY` — from step 1.
- `EVENT_REMINDER_FROM_EMAIL` — must be a verified sender/domain in Resend.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the Edge Function runtime — never set these yourself.

## 3. Set up the daily schedule

Once migrations have been applied (automatically, per step 2), this project has two `pg_cron` + `pg_net` jobs (created by migrations `0020` and `0025`):

| Job | Runs | Purpose |
|---|---|---|
| `send-event-reminders-daily` | At whatever time is currently configured (see step 4) | Actually checks for due reminders and sends them. |
| `sync-event-reminder-schedule-daily` | Fixed, `00:00 Asia/Ho_Chi_Minh` every day | Re-applies the Admin's configured send time to the job above — see "A send-time change applies starting tomorrow" in step 4. |

**One-time prerequisite per project**: both jobs call the Edge Function over HTTP using two Vault secrets. Create them via Dashboard → **Project Settings** → **Vault**, or SQL:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service_role_key>', 'service_role_key');
```

Create these before the migrations first run (either via the deploy workflow or manually) so the jobs' `net.http_post` calls have something to read. Verify with:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 5;
```

## 4. Configure and turn it on from the Admin screen

Sign in as **Admin** → sidebar → **Cấu hình thông báo**.

- **Bật gửi email nhắc nhở tự động** — the master on/off switch. While off, the function checks this flag on every run and does nothing.
- **Số ngày báo trước** — how many days ahead of an event to send the advance reminder (default 7).
- **Chọn mẫu có sẵn** — pick one of the predefined templates (formal, warm, or short-tone) to pre-fill the email content below; you can still edit the text afterward. Every predefined option is written generically, so it reads correctly for both a birthday and a death-anniversary reminder — the "Xem trước" (preview) section directly under the text box always shows both, so you can check before saving.
- **Nội dung email mẫu** — the actual template text, using placeholders `{{ten_ca_nhan}}`, `{{loai_su_kien}}`, `{{ngay_duong}}`, `{{ngay_am}}`, `{{so_ngay_con_lai}}`.
- **Giờ gửi email hằng ngày** — the time of day (Vietnam time) the daily check runs, default 06:00.
  - **A send-time change applies starting tomorrow, not immediately.** Saving a new time updates the setting right away, but the actual schedule only picks it up at the next `sync-event-reminder-schedule-daily` run (00:00 Vietnam time) — so if you change it at, say, 2pm today, today's reminder run (if it hasn't happened yet) still uses the old time; the new time takes effect from tomorrow onward.
- **Danh sách người nhận chung** — the default recipient list (one email per line); each family tree may optionally have its own override list further down the page.

That's it — reminder emails now send automatically per the configured schedule, template, and recipients.
