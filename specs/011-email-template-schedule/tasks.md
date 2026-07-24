# Tasks: Selectable Email Templates & Configurable Send Time for Event Notifications

**Input**: Design documents from `/specs/011-email-template-schedule/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/notification-settings-templates-schedule.md](./contracts/notification-settings-templates-schedule.md), [quickstart.md](./quickstart.md)

**Tests**: Not explicitly requested by the spec. A small unit-test task is still included for the one new pure helper (`renderPreview`), matching this repo's existing convention of unit-testing every pure logic module (e.g. `tests/unit/send-event-reminders-logic.test.ts`) — not a full TDD gate.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup

No setup tasks required. This feature introduces no new dependency, build tooling, or lint config (plan.md Technical Context: "No new runtime dependency is introduced"), and the one new top-level directory (`docs/`) is created directly by the task that writes into it (T010), not as a separate scaffolding step.

---

## Phase 2: Foundational (Blocking Prerequisites)

None. User Story 1 (front-end-only template list + preview) and User Story 2 (new DB column + sync job) touch disjoint files with no shared blocking prerequisite — see data-model.md and research.md §1–3. Proceed directly to the user story phases below.

---

## Phase 3: User Story 1 - Pick a ready-made email template (Priority: P1) 🎯 MVP

**Goal**: An Admin can browse ≥3 predefined, generic (birthday-and-death-anniversary-safe) email templates, preview each one against both a birthday and a death-anniversary sample, pick one to pre-fill the existing free-text template field, and still edit it further before saving.

**Independent Test**: Open the notification settings screen, select each predefined template in turn, confirm the preview reads correctly for both sample event types with no leftover `{{...}}` tokens, edit the text, save, and reload to confirm the saved wording persisted — all without touching the send-time setting or the setup guide.

### Implementation for User Story 1

- [X] T001 [P] [US1] Create the predefined template list (≥3 entries, e.g. formal/warm/short tone, each generic across event types per FR-002, using the existing placeholders `{{ten_ca_nhan}}`, `{{loai_su_kien}}`, `{{ngay_duong}}`, `{{ngay_am}}`, `{{so_ngay_con_lai}}`) in `src/features/notifications/predefinedTemplates.ts`
- [X] T002 [P] [US1] Create the local preview-render helper (a `{{key}}` substitution function, no Deno/server import — research.md §2) plus the fixed birthday (`loai_su_kien: "sinh nhật"`) and death-anniversary (`loai_su_kien: "ngày giỗ"`) sample variable sets in `src/features/notifications/renderPreview.ts`
- [X] T003 [US1] Add unit tests for the helper from T002 covering both sample renders and detecting any leftover placeholder in `tests/unit/render-preview.test.ts` (depends on T002)
- [X] T004 [US1] Add a template `<select>` picker to `ConfigForm` in `src/features/notifications/NotificationSettingsPanel.tsx`, populated from `predefinedTemplates.ts`; selecting an option sets the existing `template` state to that option's content without auto-saving (depends on T001)
- [X] T005 [US1] Add a "Xem trước" preview section to `ConfigForm` in `src/features/notifications/NotificationSettingsPanel.tsx` that renders the *current* `template` state against both sample sets from `renderPreview.ts` (depends on T002, T004)

**Checkpoint**: User Story 1 is fully functional and testable independently of Stories 2 and 3.

---

## Phase 4: User Story 2 - Choose what time of day the daily check runs (Priority: P2)

**Goal**: An Admin can set the daily reminder-send time (default 06:00 Asia/Ho_Chi_Minh); the change is persisted immediately but only actually takes effect on the live schedule starting the next Vietnam calendar day, never intraday (Clarifications 2026-07-24).

**Independent Test**: Change the send time in settings, save, confirm the config row updated immediately but `cron.job`'s `send-event-reminders-daily` schedule has not changed yet, then manually invoke `select public.sync_event_reminder_schedule();` and confirm the schedule now matches the new time — all without touching the template picker or the setup guide (quickstart.md §3).

### Implementation for User Story 2

- [X] T006 [P] [US2] Write migration `supabase/migrations/0025_event_notification_daily_send_time.sql`: add `daily_send_time time not null default '06:00:00'` to `event_notification_config`; create `public.sync_event_reminder_schedule()` (reads `daily_send_time`, computes the UTC-equivalent `<minute> <hour>` at a fixed +7h offset, calls `cron.schedule('send-event-reminders-daily', '<minute> <hour> * * *', <unchanged net.http_post command from migration 0020>)`); schedule a new `sync-event-reminder-schedule-daily` pg_cron job fixed at `'0 17 * * *'` calling that function (data-model.md, contracts/notification-settings-templates-schedule.md)
- [X] T007 [US2] Add `dailySendTime: string` to the `EventNotificationConfig` interface in `src/types/index.ts` (depends on T006)
- [X] T008 [US2] Map `daily_send_time` ⇄ `dailySendTime` in `CONFIG_COLUMNS`, `mapConfigRow`, `getConfig`, and `updateConfig` in `src/features/notifications/notificationConfigService.ts` (depends on T007)
- [X] T009 [US2] Add a time input bound to a new `dailySendTime` state to `ConfigForm` in `src/features/notifications/NotificationSettingsPanel.tsx`, saved via the existing submit handler, with adjacent copy noting the new time applies starting tomorrow, not immediately (depends on T008)

**Checkpoint**: User Stories 1 and 2 both work independently of each other.

---

## Phase 5: User Story 3 - Follow a written guide to set up event emails end-to-end (Priority: P3)

**Goal**: A single new Markdown guide documents the full setup — provider account, Edge Function deployment, both pg_cron jobs, and configuring template/send-time/recipients from the Admin screen — accurately reflecting Stories 1 and 2 as delivered.

**Independent Test**: Have someone unfamiliar with the codebase follow only `docs/event-notification-setup.md` top to bottom and reach a working, sending configuration, per quickstart.md §5.

### Implementation for User Story 3

- [X] T010 [US3] Write `docs/event-notification-setup.md` covering, in order: transactional email provider account/API key, Edge Function deployment, both `pg_cron` jobs (`send-event-reminders-daily` and `sync-event-reminder-schedule-daily`) and their one-time Vault-secret prerequisite, and the Admin settings walkthrough for the template picker (US1) and send-time config including the next-day-effective note (US2) — per contracts/notification-settings-templates-schedule.md "Setup Guide" (depends on T004, T005, T009 so it documents the delivered UI, not a plan) — later also updated by 012-supabase-deploy-workflow's T011 to reflect automated deployment
- [X] T011 [US3] Trim `README.md`'s "Event-reminder emails (Edge Function)" section to a short pointer at `docs/event-notification-setup.md`, removing the now-duplicated steps (depends on T010)

**Checkpoint**: All three user stories are independently functional and documented.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T012 [P] Run `npm run lint` and `npx vitest run` to confirm no regressions across all touched notification files — both clean (0 lint errors, 103/103 tests passing)
- [ ] T013 Execute quickstart.md validation scenarios 1–5 (migration check, US1 preview, US2 next-day scheduling via manual `sync_event_reminder_schedule()` call, dedupe check, guide walkthrough) and record results — **NOT executed**: no Supabase CLI / live project access in this environment; migration SQL was instead verified via careful manual/static review (nested dollar-quoting, `mod()`/`extract()` UTC-offset arithmetic, `cron.schedule` upsert-by-name semantics all check out) — a maintainer should still run this against a real project before relying on it

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None (see Phases 1–2 above) — user stories can start immediately.
- **User Story 1 (Phase 3)**: No dependency on Story 2 or 3.
- **User Story 2 (Phase 4)**: No dependency on Story 1 — independent DB column + independent form field. (T009 and T004/T005 all edit `NotificationSettingsPanel.tsx`; if worked in parallel by different people, expect a merge, not a functional conflict.)
- **User Story 3 (Phase 5)**: Depends on Stories 1 and 2 being implemented (T010 needs T004, T005, T009) — matches spec.md's own stated ordering rationale ("Stories 1 and 2 must exist for the guide to describe them accurately").
- **Polish (Phase 6)**: Depends on all three stories being complete.

### Parallel Opportunities

- T001, T002 (US1) and T006 (US2) can all start in parallel — no shared files, no shared dependencies.
- T003 (US1 test) can run in parallel with T004/T005 once T002 is done, since it touches a different file (`tests/unit/render-preview.test.ts` vs. `NotificationSettingsPanel.tsx`).

---

## Parallel Example: Kicking off Stories 1 and 2 together

```bash
Task: "Create predefined template list in src/features/notifications/predefinedTemplates.ts"
Task: "Create renderPreview helper + sample vars in src/features/notifications/renderPreview.ts"
Task: "Write migration supabase/migrations/0025_event_notification_daily_send_time.sql"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (T001–T005).
2. **STOP and VALIDATE**: run quickstart.md §2 manually.
3. Ship — Admins get the template picker + preview even before the send-time setting exists.

### Incremental Delivery

1. Phase 3 (US1) → validate → ship.
2. Phase 4 (US2) → validate via quickstart.md §3–4 → ship.
3. Phase 5 (US3) → validate via quickstart.md §5 → ship.
4. Phase 6 (Polish) → final regression pass.

---

## Notes

- 13 tasks total: 5 (US1) + 4 (US2) + 2 (US3) + 2 (Polish).
- Every implementation task names its exact file path; T006 is the only task touching generated/system SQL objects (`cron.job`, `public.sync_event_reminder_schedule()`) rather than a plain table.
- No contract/integration test tasks were generated beyond T003, since this feature has no new HTTP-level contract (the Edge Function itself is unchanged — research.md §4) and the scheduling contract (T006) is most reliably validated manually via quickstart.md §3, not a Vitest unit test.
