# Data Model: Selectable Email Templates & Configurable Send Time

## `event_notification_config` (existing table, one new column)

Extends the singleton row from migration `0014_event_notification_config.sql`.

| Column | Type | Notes |
|---|---|---|
| `daily_send_time` | `time` | **New.** `not null default '06:00:00'`. Always interpreted as Asia/Ho_Chi_Minh wall-clock time (fixed UTC+7, no DST — same assumption `vietnamToday()` already makes). This is the Admin's *currently configured, desired* value — see "Effective vs. configured" below for when it actually takes effect. |
| `enabled`, `template`, `days_before`, `default_recipients`, `updated_by`, `updated_at` | *(unchanged)* | Existing columns; `template` is where a picked predefined template's content lands once saved (see Predefined Email Template below). |

RLS: no change — the existing `event_notification_config_admin_only` policy (migration `0014`) already covers every column on the row, including the new one.

### Effective vs. configured send time

There is deliberately **no** separate "effective" column. The single source of truth for *what actually drives the live schedule right now* is the `schedule` column of the `send-event-reminders-daily` row in `cron.job` — and per Clarifications (2026-07-24), that only gets rewritten once per Vietnam calendar day, by `sync_event_reminder_schedule()` (see below). `event_notification_config.daily_send_time` is always the Admin's latest saved intent; it may be ahead of what's actually running until the next Vietnam-midnight sync.

## Predefined Email Template (front-end only — no table)

Not persisted. Lives as a constant list in `src/features/notifications/predefinedTemplates.ts`.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable key for the picker option (e.g. `"formal"`, `"warm"`, `"short"`). Not stored anywhere once picked — see below. |
| `label` | `string` | Short, human-readable name shown in the picker (e.g. "Trang trọng"). |
| `content` | `string` | The template body itself, using the same placeholder set as free-form templates: `{{ten_ca_nhan}}`, `{{loai_su_kien}}`, `{{ngay_duong}}`, `{{ngay_am}}`, `{{so_ngay_con_lai}}` (per FR-002, generic across birthday and death-anniversary). |

**Lifecycle**: picking one copies its `content` into the *existing* `event_notification_config.template` field (in the settings form's local state, then on save, into the database column exactly as free-form text is saved today). Once saved, the row has no memory of *which* predefined template (if any) produced that text — it's indistinguishable from text the Admin typed by hand. This matches FR-004/FR-005 (still editable afterward) and the Edge Case about re-selecting to revert (re-picking the same `id` just re-copies its current `content` again).

## Sample Preview Data (front-end only — no table)

Two fixed variable sets used only to render a live preview of a template before saving (FR-003, SC-002) — never sent as real email, never persisted.

| Sample | `loai_su_kien` | Purpose |
|---|---|---|
| Birthday sample | `"sinh nhật"` | Confirms a predefined/edited template reads correctly for a birthday occurrence. |
| Death-anniversary sample | `"ngày giỗ"` | Confirms the same template also reads correctly for a death-anniversary occurrence — the generic-wording requirement (FR-002) is only actually verified by checking both. |

## `cron.job` (pg_cron system table — no migration-owned schema, referenced for clarity)

Two relevant rows after this feature, both created by migrations (`0020`, and the new one for this feature):

| `jobname` | `schedule` | Purpose |
|---|---|---|
| `send-event-reminders-daily` | Derived from `event_notification_config.daily_send_time` as of the last Vietnam-midnight sync; expressed in UTC (`<minute> <hour> * * *`) | The actual daily reminder-send trigger (unchanged in *purpose* from migration `0020`; now schedule-mutable instead of fixed). |
| `sync-event-reminder-schedule-daily` | `'0 17 * * *'` (fixed — 00:00 Asia/Ho_Chi_Minh, no DST) | **New.** Once per Vietnam day, calls `public.sync_event_reminder_schedule()`, which re-derives `send-event-reminders-daily`'s schedule from the config row's current `daily_send_time` and re-applies it via `cron.schedule(...)` (upsert by job name). |

## `public.sync_event_reminder_schedule()` (new SQL function)

Not a table, but the one new piece of server-side logic this feature introduces:

- **Input**: none (reads `event_notification_config.daily_send_time` itself).
- **Behavior**: computes the UTC-equivalent `<minute> <hour>` for the configured Asia/Ho_Chi_Minh time (`utc_hour = (vn_hour - 7 + 24) mod 24`), then calls `cron.schedule('send-event-reminders-daily', '<minute> <hour> * * *', <same net.http_post command as migration 0020>)`.
- **Output**: none (`void`); its effect is entirely the side effect on `cron.job`.
- **Ownership/privilege**: created by the migration-running role (no `security definer` needed — see research.md §3), and only ever invoked by the `sync-event-reminder-schedule-daily` pg_cron job, never directly by client code.
