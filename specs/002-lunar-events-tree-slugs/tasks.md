# Tasks: Lunar Dates, Upcoming Events Calendar & Shareable Tree URLs

**Input**: Design documents from `/specs/002-lunar-events-tree-slugs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md; per-story dedicated test tasks are therefore omitted. Unit and end-to-end test authoring is instead consolidated into the Polish phase (T029–T030), matching the precedent set in `specs/001-family-tree-app/tasks.md`.

**Organization**: Tasks are grouped by user story (spec.md priorities P1/P2/P3) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths below are relative to the repository root; `@/` is the `src/` alias (`vite.config.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repo-wide scaffolding touched by more than one story, done once up front to avoid conflicting edits later.

- [X] T001 [P] Extend shared types in `src/types/index.ts`: add `slug: string` to `FamilyTreeSummary`, and add new `LunarDate`, `LifeEvent`, `EventNotificationConfig`, `NotificationRecipientsOverride` types mirroring `data-model.md`
- [X] T002 [P] Add `supabase/functions/**` to the ESLint ignore list in `eslint.config.js` (new Deno Edge Function code is linted/typechecked by Deno's own tooling, not the Vite/Node TypeScript config)

**Checkpoint**: Shared type surface and tooling config ready — user story implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

None required for this feature. The three user stories are deliberately independent (spec.md's "Why this priority" notes: US1 is self-contained, US3 touches an unrelated part of the app, and US2 only *optionally* builds on US1's lunar-conversion output once that exists). Each story's own schema/utility prerequisites are scoped inside that story's phase below rather than duplicated here.

---

## Phase 3: User Story 1 - See Lunar Dates Alongside Gregorian Dates (Priority: P1) 🎯 MVP

**Goal**: Every fully-known birth/death date in the person detail view shows its computed lunar-calendar equivalent alongside the existing Gregorian date; partially-known dates clearly show "unavailable" instead.

**Independent Test**: Open any person's detail view who has a known, complete birth date; confirm the lunar-calendar equivalent appears next to the Gregorian date. Fully testable without the calendar or tree-URL features.

### Implementation for User Story 1

- [X] T003 [P] [US1] Implement the Gregorian→lunar conversion function per `contracts/lunar-date-conversion.md` in `src/lib/lunarCalendar.ts` — verified against known reference dates (Tết 2000/2021/2022/2023/2024, the 2020 leap 4th month) plus out-of-range/invalid-date guards
- [X] T004 [US1] Implement the `LunarDateBadge` presentational component (renders the lunar day/month, an unambiguous leap-month label, or an "unavailable" state) in `src/features/individuals/LunarDateBadge.tsx` (depends on T003)
- [X] T005 [US1] Render `LunarDateBadge` next to each fully-known birth/death date, and nothing (or an "unavailable" note) for partial/unknown dates, in `src/features/individuals/IndividualDetailPanel.tsx` (depends on T004)
- [X] T006 [US1] Ensure the new lunar-date labels and "unavailable" copy are in Vietnamese, consistent with the rest of `IndividualDetailPanel.tsx` (depends on T005)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Browse Upcoming Life Events on a Calendar (Priority: P2)

**Goal**: A new "Upcoming Events" sidebar item opens a month calendar (Gregorian + lunar per day, events highlighted, tap for detail) for the currently-open tree; an Admin can configure and have the system send automatic email reminders ahead of each event.

**Independent Test**: From the sidebar, open "Upcoming Events", browse to a month with a known birthday/anniversary, confirm the day is highlighted, tap it, confirm the right event(s) show. The calendar/detail half is testable without ever touching notification settings.

### Implementation for User Story 2

- [X] T007 [P] [US2] Implement `useMonthEvents` (derives per-day Life Events from an already-fetched individuals list, per `contracts/events-calendar.md`) in `src/features/events/useMonthEvents.ts`
- [X] T008 [US2] Implement `CalendarGrid` (month grid, Gregorian + lunar per cell via `LunarDateBadge` from T004, highlighted days, month navigation) in `src/features/events/CalendarGrid.tsx` (depends on T007, T004)
- [X] T009 [US2] Implement `DayEventsPanel` (lists matching events for a selected day, or an explicit "no events" message) in `src/features/events/DayEventsPanel.tsx` (depends on T007)
- [X] T010 [US2] Implement the `UpcomingEvents` page wiring `CalendarGrid` + `DayEventsPanel` to the currently-open tree's individuals, visible to guests exactly when the tree is public (spec FR-021) in `src/pages/UpcomingEvents.tsx` (depends on T008, T009)
- [X] T011 [US2] Add the `/su-kien-sap-toi` route and a `SidebarItem` entry point to `UpcomingEvents` in `src/app/router.tsx` and `src/pages/Home.tsx` (depends on T010)
- [X] T012 [P] [US2] Create migration `supabase/migrations/0014_event_notification_config.sql`: singleton `event_notification_config` table and `family_tree_notification_recipients` override table, both Admin-only RLS, per `data-model.md`
- [X] T013 [P] [US2] Create migration `supabase/migrations/0015_event_notification_log.sql`: `event_notification_log` dedupe table (service-role-only write, Admin-only select RLS) per `data-model.md`
- [X] T014 [US2] Implement `notificationConfigService` (`getConfig`, `updateConfig`, `getRecipientOverride`, `setRecipientOverride`, `clearRecipientOverride`) in `src/features/notifications/notificationConfigService.ts` (depends on T012)
- [X] T015 [US2] Implement `NotificationSettingsPanel` (enabled toggle, template editor, days-before input defaulting to 7, default recipients editor, per-tree override editor) in `src/features/notifications/NotificationSettingsPanel.tsx` (depends on T014)
- [X] T016 [US2] Add the Admin-only `/quan-tri/thong-bao` route (`RequireRole allow={["admin"]}`) hosting `NotificationSettingsPanel`, plus its sidebar entry, in `src/pages/Admin/NotificationSettings.tsx`, `src/app/router.tsx`, and `src/pages/Home.tsx` (depends on T015)
- [X] T017 [P] [US2] Implement the due-event/dedupe decision logic per `contracts/event-notification-config.md`, as a plain TypeScript module with no Deno-only or Node-only APIs, in `supabase/functions/send-event-reminders/logic.ts`
- [X] T018 [US2] Implement the Deno handler (loads config/individuals/recipients/log via the Supabase service-role client, calls `logic.ts`, sends one email per due, undeduplicated occurrence via a `fetch` call to the Resend API, writes the corresponding `event_notification_log` row) in `supabase/functions/send-event-reminders/index.ts` (depends on T017, T012, T013)
- [X] T019 [US2] Configure the daily Supabase Cron Trigger for `send-event-reminders` and document its required secrets (`RESEND_API_KEY`, `EVENT_REMINDER_FROM_EMAIL`) in `supabase/functions/send-event-reminders/.env.example` and `supabase/config.toml` (depends on T018)
- [X] T020 [US2] Ensure all new calendar and notification-settings UI text is in Vietnamese, consistent with the rest of the app, across `src/pages/UpcomingEvents.tsx`, `src/features/events/*.tsx`, and `src/features/notifications/NotificationSettingsPanel.tsx` (depends on T011, T016)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Reach a Family Tree by a Friendly, Sharable URL (Priority: P3)

**Goal**: Every family tree has a unique, admin-editable slug; the home screen keeps showing only the default+public tree; any other tree marked public can be opened directly via `/<slug>`.

**Independent Test**: Create or open a family tree, confirm it has a generated slug, edit that slug, and confirm the tree opens via its slug-based address — no dependency on lunar dates or the events calendar.

### Implementation for User Story 3

- [X] T021 [P] [US3] Create migration `supabase/migrations/0013_family_tree_slug.sql`: add `family_trees.slug` (`NOT NULL`, `UNIQUE`, URL-safe-format `CHECK`), and backfill every existing row with a generated, collision-free slug per `data-model.md` (spec FR-019)
- [X] T022 [P] [US3] Implement `slugify` and `isValidSlug` per `contracts/tree-slug-routing.md` in `src/lib/slug.ts`
- [X] T023 [US3] Extend `treeService.ts` with slug-aware `createFamilyTree` (auto-generates via `slugify`, retries with a numeric suffix on a uniqueness conflict) and `updateTreeSlug` (validates via `isValidSlug`, surfaces conflict/format errors, never touches `slug` on a plain name edit) and `getFamilyTreeBySlug` in `src/features/trees/treeService.ts` (depends on T021, T022)
- [X] T024 [US3] Implement the `SlugField` component (auto-filled on create, editable on an existing tree, inline + server-error validation messages) in `src/features/trees/SlugField.tsx` (depends on T023)
- [X] T025 [US3] Wire `SlugField` into the Admin-only tree create/edit UI in `src/pages/Admin/TreeManagement.tsx` (depends on T024)
- [X] T026 [US3] Add the `/:slug` route resolving a tree via `getFamilyTreeBySlug` — loads it for any authenticated user, or for a guest only when `is_public = true`, otherwise shows an access-denied view — in `src/app/router.tsx` and a new `src/pages/TreeBySlug.tsx` (depends on T023)
- [X] T027 [US3] Verify and, if needed, adjust `src/pages/Home.tsx` so `/` continues to resolve only the tree marked `is_default && is_public`, unaffected by the new `/:slug` route (depends on T026)
- [X] T028 [US3] Ensure the slug field and access-denied copy are in Vietnamese, consistent with the rest of the app, in `src/features/trees/SlugField.tsx` and `src/pages/TreeBySlug.tsx` (depends on T025, T026)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Test coverage and final validation across all three stories.

- [X] T029 [P] Add unit tests for `src/lib/lunarCalendar.ts` (known reference dates, leap months, out-of-range → `null`), `src/lib/slug.ts` (diacritics incl. `đ`/`Đ`, format validation), `src/features/events/useMonthEvents.ts` (recurring match, multiple people same day, empty day), and `supabase/functions/send-event-reminders/logic.ts` (exact days-before match, dedupe-via-log, disabled short-circuit, per-tree override resolution) in `tests/unit/lunarCalendar.test.ts`, `tests/unit/slug.test.ts`, `tests/unit/useMonthEvents.test.ts`, `tests/unit/send-event-reminders-logic.test.ts`
- [X] T030 [P] Add Playwright end-to-end specs covering `quickstart.md` scenarios 1–5 for all three stories in `tests/e2e/lunar-events-tree-slugs.spec.ts`
- [X] T031 [P] Update `supabase/seed/seed.sql` with a default notification config row and a second, non-default, public tree with a distinct slug, for local dev/testing of US2 and US3
- [X] T032 Run all `quickstart.md` validation scenarios end-to-end and fix any gaps found (depends on T006, T020, T028) — no live Supabase project in this sandbox (no Docker daemon running), so this was a code-level cross-check of every scenario against the implementation, matching 001's T053 precedent. Caught and fixed one real gap: the seed data had no full-("day"-precision) birth/death dates at all, which would have made US1/US2 impossible to demonstrate locally — fixed in T031's seed.sql update (Bùi Văn Cha now has a full-precision birth *and* death date).
- [X] T033 [P] Accessibility/readability pass (contrast, font sizing) on `CalendarGrid.tsx`, `NotificationSettingsPanel.tsx`, and `SlugField.tsx`, matching the existing contrast/typography conventions from `specs/001-family-tree-app` — computed WCAG contrast ratios for every new text/background pairing introduced (amber-50/100 event highlight: 6.2–14.2:1; brand-100 selected-day state: 4.9–11.1:1; danger-on-white, brand-600-on-white: ≥4.7:1), all ≥4.5:1 AA. The one pairing under 4.5:1 (brand-600 text on its brand-50 hover state, 4.3:1) is an exact reuse of the pre-existing `Sidebar.tsx` collapse-toggle pattern already shipped in 001, not a new regression — left as-is for visual consistency rather than diverging from the established pattern.
- [X] T034 [P] Document the `send-event-reminders` Edge Function's deployment and secret-configuration steps in `README.md` — also extended `supabase/bootstrap.sql` and `supabase/teardown.sql` (the CLI-free Dashboard setup/reset path) to include the new slug/notification-config/notification-log schema, so that alternate path stays consistent with `supabase/migrations/`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Empty for this feature — no blocking work
- **User Story 1 (Phase 3)**: Depends on Setup (T001) only
- **User Story 2 (Phase 4)**: Depends on Setup; its calendar UI (T008) reuses `LunarDateBadge` from US1 (T004), so build US1 first if going strictly in priority order — but US2's notification-config half (T012–T020) has no dependency on US1 at all and could start in parallel
- **User Story 3 (Phase 5)**: Depends on Setup only — no dependency on US1 or US2
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T003 (US1) can start immediately after T001
- T012, T013 (US2 migrations) and T017 (US2 reminder logic) have no dependency on T003–T011 and can run in parallel with the US1/US2-calendar work
- T021, T022 (US3 migration + slug utility) have no dependency on US1/US2 at all and can run fully in parallel with both
- All Polish tasks marked `[P]` (T029, T030, T031, T033) can run in parallel once their dependencies are met

---

## Parallel Example: Kicking off all three stories at once

```bash
# After Setup (T001, T002) completes, these have no inter-dependencies:
Task: "Implement the Gregorian→lunar conversion function in src/lib/lunarCalendar.ts"                # T003 (US1)
Task: "Create migration 0014_event_notification_config.sql"                                            # T012 (US2)
Task: "Implement the due-event/dedupe decision logic in supabase/functions/send-event-reminders/logic.ts" # T017 (US2)
Task: "Create migration 0013_family_tree_slug.sql"                                                      # T021 (US3)
Task: "Implement slugify/isValidSlug in src/lib/slug.ts"                                                # T022 (US3)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Story 1 (T003–T006)
3. **STOP and VALIDATE**: Confirm lunar dates render correctly for known-good and partial-date people
4. Deploy/demo if ready — this alone already delivers value with zero new schema

### Incremental Delivery

1. Setup → User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (calendar first: T007–T011; notification config second: T012–T020) → validate independently → deploy
3. Add User Story 3 (T021–T028) → validate independently → deploy
4. Polish (T029–T034) once all three are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
- Run migrations in numeric order (`0013` → `0014` → `0015`) even though their tables don't depend on each other, to keep the existing `supabase/migrations/` sequence unambiguous
