# Implementation Plan: Events, Calendar & Navigation UI Refinements

**Branch**: `003-events-calendar-ui-refinements` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-events-calendar-ui-refinements/spec.md`

## Summary

Refactors four already-shipped pieces of the app from `002-lunar-events-tree-slugs`, with no new backend schema or authorization surface: (1) extract the home screen's sidebar + tree-canvas + full CRUD-modal wiring out of `Home.tsx` into a shared `TreeWorkspace` component so a tree opened by its slug URL gets identical navigation *and* full Admin/Editor management parity with the default tree — the underlying Postgres RLS policies already permit admin/editor writes on any tree row regardless of `is_default`, so this is a pure frontend wiring change, not a new permission; (2) make "Upcoming Events" resolve the tree from route context (default vs. slug) instead of always the one default tree, via a second route sharing the same page component; (3) replace the calendar's 50/50 split-panel layout with a wide grid plus a `Modal`-based popup for a selected date's events; (4) reformat every inline lunar-date pairing to a compact `DD/MM/YYYY AL` (with an explicit leap-month qualifier), and apply two copy renames (the in-laws toggle, and the app's own generic name).

## Technical Context

**Language/Version**: Unchanged from 002 — TypeScript 5.x on Node.js 20 LTS; ES2022 browser target.

**Primary Dependencies**: Unchanged from 001/002 (React 19, Vite, `@xyflow/react`, `d3-hierarchy`, `@supabase/supabase-js`, `@tanstack/react-query`, `react-router-dom`, Tailwind CSS, `react-hook-form` + `zod`). No new dependency — this feature reuses the existing `Modal` component (`src/app/Modal.tsx`) for the new date-detail popup rather than introducing a popup/overlay library, and reuses the existing `Sidebar`/`SidebarSection`/`SidebarItem`/`SidebarToggle` primitives (`src/app/Sidebar.tsx`) for the newly-shared sidebar.

**Storage**: No schema change. Verified against `supabase/migrations/0007_rls_policies.sql`: `individuals_admin_editor_insert/update/delete` and `relationships_admin_editor_insert/delete` already grant admin/editor write access scoped only by role, not by `family_trees.is_default` — so exposing the same management UI on a slug-viewed tree grants no new capability at the database layer; it only builds the frontend that was missing.

**Testing**: Unchanged tooling (Vitest + React Testing Library, Playwright). Existing specs that assert the old side-by-side calendar layout, the old block-style lunar-date text, the old toggle label, or the old app-title string (`tests/unit/*.test.ts`, `tests/e2e/lunar-events-tree-slugs.spec.ts`) will need updating to match; no new test *tooling*.

**Target Platform**: Unchanged — modern desktop/tablet browsers.

**Project Type**: Web application — frontend-only SPA against Supabase, unchanged. This feature adds no new server-side surface (no Edge Function, no migration) — everything is component refactoring, routing, and presentation.

**Performance Goals**: No new goals — the wider calendar grid and popup are pure layout/interaction changes with the same data volume as 002 (a few hundred individuals per tree at most).

**Constraints**: The refactor MUST NOT change any existing authorization outcome for Viewer/guest (read-only stays read-only on every tree, per spec FR-002a) — only Admin/Editor gain a *reachable UI* for a capability RLS already permitted. The Upcoming Events route change MUST NOT alter what the default-tree/home path shows today (spec acceptance scenario 3/5). The lunar-format change MUST NOT alter which dates can or cannot be converted (spec FR-008) — purely a `formatLunarDate` presentation change.

**Scale/Scope**: Same as 001/002 (up to 5 trees, hundreds of individuals each).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, exactly as for 001 and 002 — no project-specific gates exist to check this plan against. **Result: PASS (no gates defined).**

**Post-Phase-1 re-check**: Unchanged — still PASS. `research.md` and `data-model.md` confirm this feature adds no new schema, no new RLS policy, and no new dependency; there is nothing for a future constitution to have a gate against here.

## Project Structure

### Documentation (this feature)

```text
specs/003-events-calendar-ui-refinements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — confirms no schema change
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── tree-workspace-navigation.md
│   ├── calendar-popup-layout.md
│   ├── inline-lunar-format.md
│   └── copy-updates.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── router.tsx                              # add "/:slug/su-kien-sap-toi", declared before the "/:slug" catch-all
├── pages/
│   ├── Home.tsx                                 # slim to: resolve default tree, keep existing loading/guest/empty states, render <TreeWorkspace>
│   ├── TreeBySlug.tsx                           # slim to: resolve tree by slug, keep existing loading/not-found states, render <TreeWorkspace> (replaces its current bespoke read-only rendering)
│   ├── UpcomingEvents.tsx                       # resolve tree via optional `slug` route param (default tree when absent); wide single-column layout; selected day opens a <Modal> instead of a permanent side panel
│   └── Login.tsx                                # heading text → "Gia Phả App"
├── features/
│   ├── tree/
│   │   └── TreeWorkspace.tsx                     # NEW — extracted from Home.tsx: Sidebar (Hiển thị / Quản lý cá thể / Tài khoản sections), TreeCanvas, IndividualDetailPanel, and all 5 CRUD/import modals, parameterized by `treeId`/`treeName`/`upcomingEventsPath`
│   ├── events/
│   │   ├── CalendarGrid.tsx                      # layout sizing for a wide, single, dominant grid (no data/derivation change)
│   │   └── DayEventsPanel.tsx                    # drop the "no day selected" branch (only ever rendered inside the open popup); date heading uses the new inline lunar format
│   └── individuals/
│       └── LunarDateBadge.tsx                    # formatLunarDate → compact `DD/MM/YYYY AL` (+ " (nhuận)" when leap); renders inline (`<span>`), not as its own block line
└── index.html                                    # <title> → "Gia Phả App"

tests/
├── unit/                                         # update assertions touching the old lunar-text format and old toggle label
└── e2e/                                           # update assertions touching the old calendar layout, old toggle label, and old app title
```

**Structure Decision**: Same single-frontend-SPA-against-Supabase shape as 001/002 — this feature only reorganizes existing frontend code (extracting `TreeWorkspace`) and adjusts presentation/routing; it introduces no new architectural layer. The extraction is the one non-trivial structural change: `Home.tsx` and `TreeBySlug.tsx` become thin "resolve which tree, then hand off" wrappers around one shared component, which is what lets US1's "identical capability everywhere" requirement hold without duplicating ~200 lines of modal/CRUD wiring twice.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
