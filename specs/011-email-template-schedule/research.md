# Research: Selectable Email Templates & Configurable Send Time

All items below were resolved from the existing codebase (`src/features/notifications/`, `supabase/functions/send-event-reminders/`, `supabase/migrations/0014`, `0015`, `0020`, `0024`) plus the spec's Clarifications — no external unknowns remained after reading that code, so no NEEDS CLARIFICATION markers are carried into this plan.

## 1. Where do the predefined templates live?

**Decision**: A plain TypeScript array/constant in `src/features/notifications/` (e.g. `predefinedTemplates.ts`), each entry `{ id, label, content }`. No new database table, no new column beyond the one described in §3.

**Rationale**: Spec FR-001/Assumptions are explicit that this is front-end-only. The existing `template` column on `event_notification_config` (migration `0014`) is already a free-text field the Admin can edit; picking a preset simply needs to set that same field's in-memory value before save — reusing `ConfigForm`'s existing `template` state and `updateConfig` call in `notificationConfigService.ts` (`NotificationSettingsPanel.tsx:38`, `notificationConfigService.ts:56`). No new persistence path is needed.

**Alternatives considered**: A `notification_email_templates` table with an admin-editable CRUD UI — rejected because the spec explicitly rules it out ("front-end only, don't need saved to db") and it would duplicate the existing free-text `template` column's job.

## 2. How is a template previewed before saving?

**Decision**: A small, local, pure helper (`renderPreview(template, sampleVars)` — a straight port of the `{{key}}` substitution regex already used server-side) plus two fixed sample variable sets: one with `loai_su_kien: "sinh nhật"` (birthday) and one with `loai_su_kien: "ngày giỗ"` (death anniversary), per FR-002/SC-002.

**Rationale**: The authoritative render logic already exists in `supabase/functions/send-event-reminders/logic.ts` (`renderTemplate`, line ~88), but it is a private (non-exported) function in a Deno Edge Function module — not meant to be imported by the Vite-built frontend bundle. The substitution itself is a single `String.replace` with a placeholder regex; duplicating that one line locally is simpler and safer than exporting a Deno-adjacent module into the client bundle, and keeps the two render paths (server send-time, client preview-time) decoupled on purpose — a preview is cosmetic, not the source of truth for what actually gets sent (the save button, followed by the next real send, is).

**Alternatives considered**: Exporting `renderTemplate` from `logic.ts` and importing it client-side — rejected as unnecessary coupling for a one-line regex; also considered calling the deployed Edge Function itself for a "real" preview — rejected as it would require a network round-trip and elevated (service-role-only) data access for something that doesn't need live data at all.

## 3. How does the Admin's chosen send time actually change when the daily job runs?

**Decision**: Add one new column, `event_notification_config.daily_send_time time not null default '06:00:00'` (a wall-clock value, always interpreted as Asia/Ho_Chi_Minh — same fixed-offset assumption `vietnamToday()` already makes in `index.ts`). A new SQL function, `public.sync_event_reminder_schedule()`, reads that column and calls `cron.schedule('send-event-reminders-daily', <computed UTC cron expression>, <same command as migration 0020>)` — `cron.schedule` upserts by job name, so this reschedules the *existing* job in place rather than creating a duplicate. That function is itself invoked by a second, small `pg_cron` job, `sync-event-reminder-schedule-daily`, fixed at `'0 17 * * *'` (17:00 UTC = 00:00 Asia/Ho_Chi_Minh, no DST) — i.e., once per Vietnam calendar day, at the start of the day.

**Rationale**: This directly implements the Clarifications answer ("applies from tomorrow — today still runs at whatever time was in effect at the start of today"). Because the real job's `pg_cron` schedule is only ever rewritten once, at the Vietnam-day boundary, any edit the Admin makes during the day simply waits for that next boundary — no comparison logic ("has today's old/new time already passed?") is needed anywhere, which keeps FR-008 trivially correct rather than relying on fragile time-of-edit arithmetic. It also requires no `security definer` trickery: unlike an `AFTER UPDATE` trigger (which would run under the Admin's own constrained role through RLS), this sync job is itself a `pg_cron` job, which — like the existing job from migration `0020` — executes under the role that scheduled it (the migration-running role), which already has the needed `cron.schedule` privilege.

**Alternatives considered**:
- **Reschedule immediately via an `AFTER UPDATE` trigger** on `event_notification_config` — rejected: it directly contradicts the "applies from tomorrow" clarification (an intraday edit would take effect intraday), and would need a `security definer` function (mirroring `public.handle_new_user()` in migration `0002`) purely to route around RLS, adding privilege-escalation surface for no behavioral benefit.
- **Poll every N minutes and self-check "is it time yet"** inside the Edge Function itself (replacing the pg_cron-exact-time model with a frequent-poll-and-guard model) — rejected: a much larger change to a function that already has a simple, well-tested "run once, check due reminders" shape; would also need its own "have I already run today" guard, which the exact-time cron model gets for free.

## 4. Does changing the send time risk double-sending or skipping a reminder?

**Decision**: No code change needed in `logic.ts` / `index.ts` — FR-009 is already satisfied by the existing architecture.

**Rationale**: `computeDueReminders` (and the `event_notification_log` dedupe it drives) keys entirely on *calendar date* (`vietnamToday()`) and *occurrence year*, never on when during the day the function happened to run. Whether the function runs at 06:00 or 20:00 on a given Vietnam day, it asks the same question — "what's due today, and what have I already logged?" — and gets the same answer. A schedule-time change only shifts *when* that daily question gets asked, never *what* the answer is.

## 5. Where does the new setup guide live, and what does it replace?

**Decision**: A new `docs/event-notification-setup.md` (new `docs/` directory — this is the first file in it). The existing "Event-reminder emails (Edge Function)" section in `README.md` is trimmed to a short pointer at that file, rather than duplicating the steps in two places.

**Rationale**: FR-011 asks for "a single Markdown document" as the canonical setup reference; the current README section already covers most of the ground (provider setup, deploy, `pg_cron`/Vault prerequisites) but will grow once it also has to explain the template picker and the configurable send time (Stories 1–2) — large enough to warrant its own file rather than expanding README further. `docs/` as a location matches common convention for this kind of standalone operational guide and leaves room for the sibling feature `012-supabase-deploy-workflow`'s own documentation later without crowding the root.

**Alternatives considered**: Keep expanding the README section in place — rejected only because the combined content (existing steps + new template/schedule UI walkthrough) would make README's most operationally-sensitive section also its longest, burying the rest of the project overview.
