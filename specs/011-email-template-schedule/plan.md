# Implementation Plan: Selectable Email Templates & Configurable Send Time for Event Notifications

**Branch**: `011-email-template-schedule` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-email-template-schedule/spec.md`

## Summary

Admins currently write the event-reminder email's wording entirely by hand and are stuck with a schedule fixed at deploy time (06:00 Asia/Ho_Chi_Minh, hardcoded in migration `0020`). This feature adds a front-end-only picker of predefined, generic (birthday-and-death-anniversary-safe) email templates that pre-fill the existing free-text `template` field, plus an Admin-configurable daily send time that's persisted as a new `daily_send_time` column and applied to the live `pg_cron` schedule once per Vietnam calendar day (never intraday, per Clarifications) via a small new sync job — and a new `docs/event-notification-setup.md` guide documenting the whole feature end to end. No new database table is introduced; the existing `event_notification_config` singleton and Edge Function architecture are extended, not replaced.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend, strict mode via `tsc -b`); PL/pgSQL (new migration/function); the existing Deno-targeted `send-event-reminders` Edge Function is unaffected by this feature's changes (research.md §4 — no code changes needed there).

**Primary Dependencies**: React 19 + `@tanstack/react-query` 5 (existing `NotificationSettingsPanel.tsx` stack — reused, not replaced), `@supabase/supabase-js` 2 (`notificationConfigService.ts`), Tailwind v4 for styling (matches existing form markup). No new runtime dependency is introduced.

**Storage**: Supabase Postgres — one new column (`event_notification_config.daily_send_time`) on an existing table; no new tables (data-model.md).

**Testing**: Vitest (unit — extend the existing `notificationConfigService`/`ConfigForm` coverage plus a small pure-function test for the local preview-render helper); no new Playwright e2e scenario is strictly required since User Stories 1–2 are exercised by the existing Admin-settings e2e coverage pattern, but the quickstart.md steps double as a manual/e2e validation script.

**Target Platform**: Same as the rest of the app — browser (Vite-built SPA) for the settings UI; Supabase-hosted Postgres + `pg_cron`/`pg_net` for the scheduling piece. No Edge Function redeploy is required by this feature (the function's own code doesn't change).

**Project Type**: Existing single-project web app talking directly to Supabase (per `README.md`'s own description) — this feature fits entirely inside that existing shape; no new project/package boundary.

**Performance Goals**: N/A beyond existing settings-form responsiveness (SC-003's "under 2 minutes" is a human-interaction target, not a system-latency one).

**Constraints**: Fixed Asia/Ho_Chi_Minh (UTC+7, no DST) offset assumption, consistent with `vietnamToday()` in `index.ts` and migration `0020`'s existing comment — the new schedule-sync arithmetic must use the same fixed offset, not a timezone library, to stay consistent with the rest of this feature area.

**Scale/Scope**: Single-tenant-per-deployment scope (one Supabase project, one singleton config row, one Admin-facing settings screen) — matches the existing feature's scale exactly; no multi-environment or multi-tenant concern in scope (see spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` contains only unfilled template placeholders (no principles have been ratified for this project) — there are no governing constraints to check against. Gate: **PASS (no applicable gates)**.

## Project Structure

### Documentation (this feature)

```text
specs/011-email-template-schedule/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── notification-settings-templates-schedule.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 0025_event_notification_daily_send_time.sql   # new column + sync_event_reminder_schedule() + sync cron job
└── functions/send-event-reminders/                     # UNCHANGED by this feature (research.md §4)

src/
├── types/index.ts                                      # EventNotificationConfig gains `dailySendTime`
└── features/notifications/
    ├── notificationConfigService.ts                    # map/save the new `daily_send_time` column
    ├── predefinedTemplates.ts                           # NEW — front-end-only template list (no DB)
    ├── renderPreview.ts                                 # NEW — small local {{key}} substitution helper + sample vars
    └── NotificationSettingsPanel.tsx                    # ConfigForm gains the template picker, preview, and send-time input

tests/unit/
├── notification-config-service.test.ts                 # extend for dailySendTime mapping (if such a test file exists; else colocate)
└── render-preview.test.ts                               # NEW — unit test for the preview substitution helper

docs/
└── event-notification-setup.md                          # NEW — the setup guide required by FR-011/FR-012

README.md                                                # "Event-reminder emails" section trimmed to point at docs/event-notification-setup.md
```

**Structure Decision**: Everything lives inside the existing single-project layout (`src/`, `supabase/`, `tests/`) exactly where the equivalent existing pieces already live — this is an extension of `002-lunar-events-tree-slugs`'s notification feature, not a new subsystem. The only new top-level directory is `docs/`, added solely to hold the one setup guide this feature requires (research.md §5); it does not imply a broader docs restructuring.

## Complexity Tracking

*No Constitution Check violations — this section is intentionally empty.*
