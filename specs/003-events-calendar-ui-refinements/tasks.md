# Tasks: Events, Calendar & Navigation UI Refinements

**Input**: Design documents from `/specs/003-events-calendar-ui-refinements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md; no dedicated per-story test-writing tasks are included. This feature *refactors* already-shipped, already-tested behavior, so the Polish phase includes updating the existing tests that assert the old behavior (layout, labels, format) rather than writing new speculative coverage — matching `plan.md`'s Testing section, which names the exact files affected.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P4) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths below are relative to the repository root; `@/` is the `src/` alias (`vite.config.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

None required. This feature adds no new dependency, tooling config, or shared type (`research.md`/`data-model.md`) — it refactors existing files only.

---

## Phase 2: Foundational (Blocking Prerequisites)

None required across *all four* stories. US2, US3, and US4 don't depend on US1 architecturally (calendar layout, lunar formatting, and copy text are independent of where that code happens to live) — the one real cross-story dependency is narrower and called out explicitly in **Dependencies & Execution Order** below: US4's toggle-relabel task targets the file US1 moves that toggle into, so it's sequenced after US1 in practice even though it isn't a formal blocking phase.

---

## Phase 3: User Story 1 - Full Navigation and Management for Any Tree, Including by Slug URL (Priority: P1) 🎯 MVP

**Goal**: A family tree opened by its slug URL gets the exact same sidebar, and — for Admin/Editor — the exact same add/edit/delete/import management capability, as the default tree on the home screen; "Upcoming Events" reflects whichever tree it was opened from.

**Independent Test**: Open a non-default, slug-accessible tree by its URL as Admin/Editor; confirm the same sidebar (viewing options *and* management actions) appears and that adding/editing/deleting an individual works exactly as on the default tree; open "Upcoming Events" from it and confirm the calendar reflects that tree's own people, not the default tree's.

### Implementation for User Story 1

- [X] T001 [P] [US1] Extract `Home.tsx`'s Sidebar (all three sections), `TreeCanvas`, `IndividualDetailPanel`, and all five modals (create/edit/delete individual, create relationship, import) into a new `src/features/tree/TreeWorkspace.tsx`, accepting `treeId: string`, `treeName: string`, `upcomingEventsPath: string` props in place of the hardcoded default-tree fetch, per `contracts/tree-workspace-navigation.md`
- [X] T002 [US1] Slim `src/pages/Home.tsx` down to: resolve the default tree exactly as today (loading / guest-not-published / no-default-tree states unchanged), then render `<TreeWorkspace treeId={tree.id} treeName={tree.name} upcomingEventsPath="/su-kien-sap-toi" />` once resolved (depends on T001)
- [X] T003 [US1] Slim `src/pages/TreeBySlug.tsx` down to: keep its existing slug-resolution and not-found/guest messaging unchanged, then render `<TreeWorkspace treeId={tree.id} treeName={tree.name} upcomingEventsPath={`/${slug}/su-kien-sap-toi`} />` in place of its current bespoke read-only `TreeCanvas`/`IndividualDetailPanel` rendering (depends on T001)
- [X] T004 [P] [US1] Add the `/:slug/su-kien-sap-toi` route to `src/app/router.tsx`, declared before the `/:slug` catch-all route
- [X] T005 [US1] Update `src/pages/UpcomingEvents.tsx` to resolve the tree via an optional `slug` route param — `getFamilyTreeBySlug(slug)` when present, `getDefaultFamilyTree()` when absent (today's behavior) — and point its "← Về trang chủ" link at `/${slug}` or `/` accordingly (depends on T004)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - A Wider Calendar With Event Details in a Popup (Priority: P2)

**Goal**: The Upcoming Events calendar is the dominant element on screen (no permanent side panel); clicking any date opens a popup with that date's events or a clear "no events" message.

**Independent Test**: Open "Upcoming Events" for any tree; confirm the calendar occupies the large majority of the screen with no permanently visible side panel; click a date and confirm a popup appears with that date's events (or a clear "no events" message), and that closing it returns to the full calendar.

### Implementation for User Story 2

- [X] T006 [US2] Replace `src/pages/UpcomingEvents.tsx`'s two-box `flex ... sm:flex-row` layout with a single, wide (~80%) container holding only `CalendarGrid`, removing the permanently-rendered `DayEventsPanel`, per `contracts/calendar-popup-layout.md`
- [X] T007 [US2] In `src/pages/UpcomingEvents.tsx`, render `<Modal title={<date heading>} onClose={...}>` wrapping `<DayEventsPanel>` whenever a day is selected (for every click, with or without events); clear the selected day whenever the visible month changes (depends on T006)
- [X] T008 [US2] Simplify `src/features/events/DayEventsPanel.tsx`: remove the "no day selected" branch, since it is now only ever rendered while a day is selected inside the open popup (depends on T007)
- [X] T009 [P] [US2] Adjust `src/features/events/CalendarGrid.tsx` cell/grid sizing so it reads well at the new, much wider container size (no change to its data/derivation logic)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Read Lunar Dates in a Compact, Inline Format (Priority: P3)

**Goal**: Every lunar date shown alongside a Gregorian date reads as a single inline `DD/MM/YYYY AL` value (with an explicit leap-month qualifier when needed), replacing the previous separate-line Vietnamese-prose format.

**Independent Test**: Open any person's detail view for someone with a fully-known birth date; confirm the lunar date appears on the same line as the Gregorian date, formatted as `DD/MM/YYYY AL`, rather than on its own line below it.

### Implementation for User Story 3

- [X] T010 [P] [US3] Change `formatLunarDate` in `src/features/individuals/LunarDateBadge.tsx` to output `DD/MM/YYYY AL` (+ `" (nhuận)"` when `isLeapMonth`), per `contracts/inline-lunar-format.md`
- [X] T011 [US3] Change `LunarDateBadge` to render inline (`<span>`, not a block `<p>`) for both the computed and "unavailable" cases (depends on T010)
- [X] T012 [US3] Verify/adjust `src/features/individuals/IndividualDetailPanel.tsx` so each date reads `<gregorian> (<lunar>)` on one line (depends on T011) — verified only, no edit needed: `LunarDateBadge` already renders directly after the Gregorian text in the same `<dd>`, and switching it to an inline `<span>` (T011) was sufficient on its own
- [X] T013 [P] [US3] Update the date-detail popup's heading to the same inline format (depends on T010) — the heading itself relocated from `DayEventsPanel.tsx` into `UpcomingEvents.tsx` as part of T007 (it's now the `Modal`'s `title`), so this task's actual edit landed in `src/pages/UpcomingEvents.tsx`'s `dayHeading()` helper rather than in `DayEventsPanel.tsx`

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: User Story 4 - Updated Wording for the In-Laws Toggle and the App's Own Name (Priority: P4)

**Goal**: The in-laws toggle reads "Ẩn dâu/rễ"; the app's own generic name (not any specific tree's name) reads "Gia Phả App" everywhere it appears.

**Independent Test**: Load the app before any tree data appears (e.g. the browser tab/title) and confirm it reads "Gia Phả App"; open the sidebar and confirm the toggle reads "Ẩn dâu/rễ" and still hides/shows in-laws exactly as before under its old label.

### Implementation for User Story 4

- [X] T014 [P] [US4] Relabel the in-laws `SidebarToggle` from "Chỉ hiển thị cùng huyết thống" to "Ẩn dâu/rễ" in `src/features/tree/TreeWorkspace.tsx` (depends on T001 — this is where the toggle now lives)
- [X] T015 [P] [US4] Update the app's generic name to "Gia Phả App" in `index.html` (`<title>`) and `src/pages/Login.tsx` heading, per `contracts/copy-updates.md` — the anticipated third location, a `TreeWorkspace.tsx` sidebar-title fallback, turned out not to exist: `Home.tsx`/`TreeBySlug.tsx` now only render `<TreeWorkspace>` once a real tree name is already resolved (T002/T003), so there is no code path where the sidebar needs a generic fallback title

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Bring existing test coverage in line with the refactored behavior, and final validation across all stories.

- [X] T016 [P] Update `tests/unit/*` assertions that reference the old toggle label or the old `formatLunarDate` output shape
- [X] T017 [P] Update `tests/e2e/lunar-events-tree-slugs.spec.ts` assertions that reference the old calendar layout, the old toggle label, the old app title, or `TreeBySlug`'s previous read-only-only behavior — no prior test actually asserted the old read-only behavior (nothing to fix there), so added new coverage instead: full management parity on a slug-viewed tree (admin add/delete), viewer sees no management controls there, tree-scoped events via `/<slug>/su-kien-sap-toi`, and the toggle/app-title copy changes
- [X] T018 Run all `quickstart.md` validation scenarios end-to-end and fix any gaps found (depends on T005, T009, T013, T015) — no live Supabase project in this sandbox (same constraint as 001/002), so this was a code-level cross-check of every scenario against the implementation, plus `npx tsc -b`, `npx eslint .`, `npx vitest run` (75/75 passing), and `npm run build`, all clean; no gaps found
- [X] T019 [P] Accessibility/readability pass on the new wide calendar layout and popup, consistent with the existing contrast/typography conventions from `specs/001-family-tree-app` — no changes needed: the reused `Modal` already carries `role="dialog"`/`aria-modal`/`aria-label`, and the calendar's only changes were larger text/spacing on the already-vetted color tokens (no new colors)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with User Story 1
- **User Story 1 (Phase 3)**: No dependency on the other stories
- **User Story 2 (Phase 4)**: No dependency on US1; shares `src/pages/UpcomingEvents.tsx` with US1's T005, so build after US1 if working sequentially to avoid merge conflicts on that file, even though neither depends on the other's *behavior*
- **User Story 3 (Phase 5)**: No dependency on US1/US2; T013 shares `DayEventsPanel.tsx` with US2's T008 — same file, different concern, sequence to avoid conflicts
- **User Story 4 (Phase 6)**: Depends on US1's T001 for *file location* only (the toggle and the title fallback move into `TreeWorkspace.tsx`) — if US4 were done first, target `Home.tsx` directly instead
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Parallel Opportunities

- T001 (US1) and T004 (US1) touch different files and can run in parallel
- T009 (US2) has no dependency on T006–T008 and can run in parallel with them
- T010 (US3) and T013 (US3) touch different files and can both start together; T011/T012 are sequential after T010
- T014 and T015 (US4) touch different files and can run in parallel once T001 exists
- T016, T017, T019 (Polish) can run in parallel

---

## Parallel Example: User Story 1

```bash
# After nothing (Setup/Foundational are empty), these can start together:
Task: "Extract Home.tsx into src/features/tree/TreeWorkspace.tsx"     # T001
Task: "Add the /:slug/su-kien-sap-toi route to src/app/router.tsx"    # T004
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001–T005)
2. **STOP and VALIDATE**: Confirm slug-viewed trees get full sidebar + management parity, and correct per-tree events
3. Deploy/demo if ready — closes the biggest gap left over from `002-lunar-events-tree-slugs`

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (wide calendar + popup) → validate independently → deploy
3. Add User Story 3 (inline lunar format) → validate independently → deploy
4. Add User Story 4 (copy updates) → validate independently → deploy
5. Polish (T016–T019) once all four are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
