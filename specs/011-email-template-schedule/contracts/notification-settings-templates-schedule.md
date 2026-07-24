# Contract: Predefined Template Picker, Configurable Send Time, and Setup Guide

Extends `specs/002-lunar-events-tree-slugs/contracts/event-notification-config.md`, which remains the authoritative contract for the base settings panel, the Edge Function's own send logic, and RLS. This document only covers what's new in `011-email-template-schedule`.

## Predefined Template Picker (`src/features/notifications/NotificationSettingsPanel.tsx`)

- On mount, `ConfigForm` additionally renders a `<select>` populated from `predefinedTemplates.ts` (spec FR-001), plus a neutral placeholder option (no predefined template selected/active).
- Selecting a predefined option:
  1. Sets the existing `template` state to that option's `content` (spec FR-004) — it does **not** save automatically; the Admin still presses the existing "Lưu cấu hình" button to persist it, identically to editing the textarea by hand today.
  2. Does not lock the textarea — the Admin can keep typing/editing afterward (FR-005); the picker and the textarea both write to the same `template` state, last-write-wins, exactly like two inputs bound to one piece of state.
- A "Xem trước" (preview) control renders the *current* `template` state's content twice — once substituted with the birthday sample vars, once with the death-anniversary sample vars (data-model.md "Sample Preview Data") — using a local, non-persisted render helper (FR-003; research.md §2). This works identically whether the current text came from a preset, from manual edits, or from a preset the Admin then edited.
- Re-selecting the same predefined option after editing overwrites the edit with that option's original `content` again (Edge Cases: "revert by re-selecting").

## Configurable Send Time (`ConfigForm` + `notificationConfigService.ts`)

- `ConfigForm` gains a time input bound to a new `dailySendTime` state, initialized from `config.dailySendTime` (default `"06:00"` when never changed — FR-007), saved via the same "Lưu cấu hình" submit as every other field on the form.
- `notificationConfigService.ts`:
  - `EventNotificationConfig` (and the DB row type) gains `dailySendTime: string` (`HH:MM:SS`, mapped from/to the new `daily_send_time` column).
  - `updateConfig(...)` accepts an optional `dailySendTime` the same way it already accepts `enabled`/`template`/`daysBefore`/`defaultRecipients` — a plain column update, no special-cased side effect triggered from the client (FR-008's "no separate deployment or manual database step" is satisfied server-side by the daily sync job, not by anything the client does on save — see below).
- **What saving does *not* do**: it does not itself reschedule anything. The saved value only becomes the live schedule at the next Vietnam-midnight sync (Clarifications 2026-07-24; data-model.md "Effective vs. configured send time"). The settings screen may optionally note this ("Thời gian mới sẽ áp dụng từ ngày mai") but showing that note is a UI-copy detail, not a behavioral requirement.

## Daily Schedule Sync (`public.sync_event_reminder_schedule()` + `sync-event-reminder-schedule-daily` cron job)

- **Trigger**: `pg_cron`, once daily, fixed at `'0 17 * * *'` UTC (00:00 Asia/Ho_Chi_Minh) — never itself reconfigurable (only the *reminder send* time is Admin-configurable, not the *sync* time).
- **Behavior**: reads `event_notification_config.daily_send_time`, converts it to a UTC `<minute> <hour> * * *` cron expression (fixed +7h offset, no DST), and calls `cron.schedule('send-event-reminders-daily', <expression>, <unchanged net.http_post command from migration 0020>)`.
- **Idempotency**: safe to run even when `daily_send_time` hasn't changed since the last sync — `cron.schedule` on an existing job name overwrites its schedule with the same value, a no-op in effect.
- **Failure handling**: if this job fails (e.g., transient DB issue), the *previous* schedule for `send-event-reminders-daily` remains in effect untouched (pg_cron only overwrites on a successful `cron.schedule` call) — a failed sync just means today's reminder run stays on yesterday's effective time, self-correcting at the next successful sync.

## Setup Guide (`docs/event-notification-setup.md`)

- MUST cover, in order: (1) transactional email provider account + API key, (2) deploying the Edge Function, (3) the two `pg_cron` jobs and their one-time Vault-secret prerequisite, (4) turning the feature on and configuring template/send-time/recipients from the Admin settings screen — including that a send-time change takes effect the next day, not immediately (FR-011, FR-012).
- MUST NOT re-describe steps already covered by `README.md`'s general project setup (local dev, `.env`, `npm install`) — it starts from "you already have the app running and a Supabase project linked."
- `README.md`'s existing "Event-reminder emails (Edge Function)" section is reduced to a short pointer to this file (research.md §5) so the two never drift out of sync with each other.
