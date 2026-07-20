# Implementation Plan: Lunar Dates, Upcoming Events Calendar & Shareable Tree URLs

**Branch**: `002-lunar-events-tree-slugs` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-lunar-events-tree-slugs/spec.md`

## Summary

Extend the existing Vite + React + Supabase genealogy app with three independently-shippable additions: (1) a client-side Gregorian→lunar date conversion shown alongside every fully-known birth/death date in the person detail view; (2) a new sidebar "Upcoming Events" calendar — a hand-rolled dual-calendar (Gregorian + lunar) month grid computed from the currently-viewed tree's existing individual records, plus an admin-only, application-wide email-reminder configuration (template, days-before, default recipients, with an optional per-tree recipient override) sent by a new Supabase Edge Function on a daily schedule; (3) a unique, admin-managed, auto-generated `slug` on `family_trees` that lets any non-default tree be opened directly by URL, while the home screen keeps showing only the default+public tree exactly as today. A single SQL migration set backfills `slug` values for existing trees and seeds the new notification-config tables so no existing data is altered.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (build tooling, unchanged from 001); ES2022 target for the browser bundle; Deno (Supabase Edge Functions runtime) for the new scheduled reminder function

**Primary Dependencies**: Existing stack unchanged (React 19, Vite, `@xyflow/react`, `d3-hierarchy`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, Tailwind CSS, `react-hook-form` + `zod`). No new npm dependency for lunar conversion or slug generation — both are small, self-contained algorithms hand-written in `src/lib/` (see research.md §1, §3) to avoid pulling in unmaintained or oversized packages for well-understood, narrow math/string problems. The new Supabase Edge Function uses only the Deno standard library plus a plain `fetch` call to a transactional email API (see research.md §2) — no email SDK dependency required.

**Storage**: Same Supabase-hosted PostgreSQL. New: `family_trees.slug` column; `event_notification_config` (singleton settings row); `family_tree_notification_recipients` (per-tree override); `event_notification_log` (idempotency/dedupe record for sent reminders). No changes to existing `individuals`/`relationships` columns — lunar dates are computed, never stored (spec FR-003, Assumptions).

**Testing**: Vitest + React Testing Library (unchanged) for the lunar-conversion function, slug-generation function, calendar-grid/highlight logic, and the reminder Edge Function's due-event/dedupe logic (kept as plain, Deno-and-Node-compatible TypeScript so the same module is imported by both the Vite app's tests and the Edge Function itself — see research.md §2). Playwright (unchanged) extended with end-to-end coverage of each new user story's acceptance scenarios.

**Target Platform**: Same modern desktop/tablet browsers as 001 for all user-facing UI; the reminder function runs server-side in Supabase's managed Deno Edge Function runtime, invoked on a schedule — no new user-facing platform.

**Project Type**: Web application — frontend-only SPA against Supabase, unchanged, plus one small, narrowly-scoped serverless function (this feature's only server-side code, isolated to the reminder job so it doesn't grow into a general backend).

**Performance Goals**: Calendar month view (grid + highlight computation) renders within 1s for a tree of a few hundred individuals (consistent with 001's 3s full-tree-render budget, this view is lighter); lunar-date computation for a single date completes synchronously with no perceptible delay in the detail view.

**Constraints**: Lunar conversion is Vietnam-calendar-correct (UTC+7 solar-term basis) and only ever computed for full-precision dates (spec FR-001–FR-003); reminder days-before defaults to 7 and is a single application-wide value (spec FR-011, Clarifications); recipients default application-wide but may be overridden per tree (spec FR-011a/FR-011b, Clarifications); slugs are URL-safe, unique, transliterate Vietnamese diacritics, and are editable by Admin only — never auto-regenerated on a name change (spec FR-014/FR-015, Edge Cases); guests viewing a public tree see the same lunar dates and events calendar as signed-in users, with no new anonymous write access introduced anywhere (spec FR-021, Clarifications); the reminder job must never send a duplicate email for the same event occurrence (spec FR-013).

**Scale/Scope**: Same small scale as 001 (up to 5 trees, each on the order of hundreds of individuals; a small number of Admin/Editor users and a larger-but-still-small number of Viewer/guest users); the reminder job evaluates, at most, a few thousand person-events per scheduled run.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (placeholder principle names/descriptions, no ratified version), exactly as when 001 was planned — there are no project-specific principles or gates to check against for this feature either. **Result: PASS (no gates defined).** If a constitution is ratified later (`/speckit-constitution`), re-run this check against this plan.

**Post-Phase-1 re-check**: Unchanged — still PASS (no gates defined). `research.md` and `data-model.md` introduce one new, narrowly-scoped serverless component (the reminder Edge Function); no gate exists to evaluate it against, and it is justified in research.md §2 regardless.

## Project Structure

### Documentation (this feature)

```text
specs/002-lunar-events-tree-slugs/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── lunar-date-conversion.md
│   ├── events-calendar.md
│   ├── tree-slug-routing.md
│   └── event-notification-config.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── 0013_family_tree_slug.sql              # slug column + generation function + backfill of existing rows
│   ├── 0014_event_notification_config.sql     # singleton config table + per-tree recipient override table (admin-only RLS)
│   └── 0015_event_notification_log.sql        # sent-reminder dedupe log (admin/service-role only)
└── functions/
    └── send-event-reminders/                  # new: Deno Edge Function, scheduled daily
        ├── index.ts                            # thin Deno handler: loads config, calls shared logic, sends emails, writes log
        └── logic.ts                            # pure, Deno-and-Node-compatible: computes due events, dedupes, renders template

src/
├── app/
│   └── Sidebar.tsx                             # existing: add the new "Upcoming Events" nav item
├── pages/
│   └── UpcomingEvents.tsx                      # new: hosts the calendar feature for the currently-open tree
├── features/
│   ├── individuals/
│   │   └── IndividualDetailPanel.tsx           # existing: render lunar date next to each Gregorian date
│   ├── events/                                  # new
│   │   ├── CalendarGrid.tsx                    # month grid, dual Gregorian/lunar cells, highlight state
│   │   ├── DayEventsPanel.tsx                  # detail panel for a selected day ("events" or "no events")
│   │   └── useMonthEvents.ts                   # derives Life Events for a month from already-fetched individuals
│   ├── notifications/                          # new
│   │   └── NotificationSettingsPanel.tsx       # Admin-only: enabled toggle, template, days-before, recipients, per-tree override
│   └── trees/
│       ├── treeService.ts                      # existing: extend with slug-aware create/edit/lookup-by-slug
│       └── SlugField.tsx                       # new: slug input/validation UI on tree create/edit forms
├── lib/
│   ├── supabase.ts                              # existing, unchanged
│   ├── lunarCalendar.ts                        # new: pure Gregorian→lunar conversion (research.md §1)
│   └── slug.ts                                 # new: pure slug generation/validation (research.md §3)
└── types/
    └── index.ts                                 # existing: extend FamilyTreeSummary with `slug`; add EventNotificationConfig, LifeEvent types

tests/
├── unit/                                        # existing: add lunarCalendar, slug, useMonthEvents, logic.ts tests
└── e2e/                                         # existing: add Playwright specs for the three new user stories
```

**Structure Decision**: Same single-frontend-SPA-against-Supabase shape as 001 — no change to that architecture. This feature adds one small, isolated server-side piece (a single scheduled Edge Function under `supabase/functions/`) purely because sending scheduled emails is not something a browser client can do; everything else (lunar math, slug math, calendar rendering, notification settings UI) stays client-side and RLS-guarded like the rest of the app. New feature folders (`src/features/events/`, `src/features/notifications/`) follow the existing `src/features/<story>/` convention so each of the three user stories remains independently developable and testable.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
