# Tasks: Usability Enhancements — Delete, Sibling Order, Tree Navigation, Email Templates, Calendar Counts

**Input**: Design documents from `/specs/005-usability-enhancements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md; no dedicated per-story test-writing tasks are included, consistent with feature 004's precedent. The Polish phase searches existing suites for assertions tied to the old behavior and runs the full existing suite plus `quickstart.md`.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) to enable independent implementation and testing of each. All five stories touch entirely disjoint files, so they can be built in any order or in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths below are relative to the repository root; `@/` is the `src/` alias (`vite.config.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

None required. No new dependency or tooling config is needed (plan.md Technical Context: zero new npm packages).

---

## Phase 2: Foundational (Blocking Prerequisites)

None required. All five stories below touch entirely disjoint files and share no new abstraction — any can be built first, and none blocks another.

---

## Phase 3: User Story 1 - Delete a Person Along With Their Relationships (Priority: P1) 🎯 MVP

**Goal**: Deleting an individual with relationships works via the already-built confirm-cascade dialog, and a second, previously-undiscovered blocker (a stale bulk-import reference) no longer breaks deletion even for individuals with zero relationships.

**Independent Test**: Delete a person who has relationships after confirming the cascade checkbox — person and relationships are gone, no error. Separately, import a new individual via the existing Excel import, then delete them immediately (zero relationships) — deletion succeeds with no confirmation dialog and no "vẫn còn mối quan hệ" error.

### Implementation for User Story 1

- [X] T001 [US1] Create `supabase/migrations/0016_import_row_results_admin_editor_update.sql` adding an `UPDATE` RLS policy on `public.import_row_results` for `admin`/`editor` roles, mirroring the existing `relationships_admin_editor_delete` policy's `public.current_role_is(array['admin', 'editor']::user_role[])` check (`supabase/migrations/0007_rls_policies.sql:88-90`), per `contracts/delete-individual.md` Preconditions
- [X] T002 [US1] In `deleteIndividual()` (`src/features/individuals/individualService.ts:73-96`): add an unconditional step — before the `individuals` delete, always update `import_row_results` rows where `individual_id = id`, setting `individual_id` to `null` — regardless of `opts?.cascadeRelationships`, per `contracts/delete-individual.md` (depends on T001)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Siblings Ordered Left-to-Right, With a Proper Eldest-Child Label (Priority: P2)

**Goal**: The tree layout arranges a parent unit's children left-to-right by each blood member's recorded `siblingOrder` (ascending, unpositioned siblings last), and position 2 (the app's existing "eldest, no thứ nhất" convention) is labeled "Con Trai/Gái/‑ Trưởng" per gender everywhere the ordinal label already appears today.

**Independent Test**: Record birth-order positions on a set of siblings with mixed genders; confirm the tree renders them left-to-right in ascending order; confirm the position-2 sibling's tree badge and detail panel both show the gender-appropriate eldest label, while position 3+ keep today's plain "Con thứ N" label.

### Implementation for User Story 2

- [X] T003 [P] [US2] In `src/lib/formatters.ts`: change `siblingOrderLabel(order?: number): string` to `siblingOrderLabel(order: number | undefined, gender: Gender): string`, adding the `order === 2` branch returning `"Con Trai Trưởng"` (male) / `"Con Gái Trưởng"` (female) / `"Con Trưởng"` (unknown), per `contracts/sibling-order-layout.md` §2
- [X] T004 [P] [US2] In `src/features/tree/useTreeLayout.ts`: during the existing step-3 parent-resolution loop (lines 112-122), also record each resolved unit's blood member's `siblingOrder` into a new `Map<string, number | undefined>` (`unitSiblingOrderOf`); replace the plain `.sort()` at the `unitChildrenOf.get(id).map(buildUnitNode)` call (line 139) with a comparator that sorts ascending by `unitSiblingOrderOf.get(unitId) ?? Number.POSITIVE_INFINITY`, falling back to the existing id-string tie-break — leave the root-level `unitRoots.sort()` (line 148) unchanged, per `contracts/sibling-order-layout.md` §1
- [X] T005 [P] [US2] In `src/features/individuals/IndividualDetailPanel.tsx` (~line 123): update the `siblingOrderLabel(individual.siblingOrder)` call to pass `individual.gender` as the second argument (depends on T003)
- [X] T006 [P] [US2] In `src/features/individuals/IndividualForm.tsx` (~line 114): update the `siblingOrderLabel(Number(siblingOrderInput))` call to pass the form's current `gender` field value as the second argument (depends on T003)
- [X] T007 [P] [US2] In `src/features/tree/IndividualNode.tsx` (~lines 40-47): replace the badge tooltip's hardcoded `` `Thứ ${individual.siblingOrder} trong các anh/chị/em` `` string with a call to `siblingOrderLabel(individual.siblingOrder, individual.gender)` (importing it from `@/lib/formatters`), so the tree badge and detail panel can never disagree (depends on T003)

**Checkpoint**: User Story 2 is fully functional and independently testable.

---

## Phase 5: User Story 3 - Open a Family Tree Directly From the Tree List (Priority: P2)

**Goal**: Every family tree list item has a "Xem chi tiết" action that opens that tree at its own current slug URL.

**Independent Test**: From the tree list, click "Xem chi tiết" on any tree item and confirm it opens that tree's own slug URL with that tree's own data; edit the slug and confirm "Xem chi tiết" uses the new value.

### Implementation for User Story 3

- [X] T008 [US3] In `src/pages/Admin/TreeManagement.tsx` (per-tree `<li>` action block, ~lines 184-217): add a `<Link to={`/${tree.slug}`}>Xem chi tiết</Link>` styled with the same classes as the existing "Sửa slug" button (`react-router-dom`'s `Link` is already imported at line 3), placed alongside the existing management actions

**Checkpoint**: User Story 3 is fully functional and independently testable.

---

## Phase 6: User Story 4 - Start From a Sample Email Template (Priority: P3)

**Goal**: The email template setting starts pre-filled with a realistic sample (using the sending feature's recognized placeholders) whenever no template has been saved, and admins can save it as-is or edit it freely.

**Independent Test**: Open the email template setting with no template previously saved — a sample appears instead of a blank box; save unchanged, reload, confirm it persists; edit and save, reload, confirm the edit persists instead.

### Implementation for User Story 4

- [X] T009 [P] [US4] In `src/features/notifications/notificationConfigService.ts`: add and export `DEFAULT_EVENT_REMINDER_TEMPLATE = "Kính báo: {{ten_ca_nhan}} sẽ có {{loai_su_kien}} vào ngày {{ngay_duong}} ({{ngay_am}}), còn {{so_ngay_con_lai}} ngày nữa."`, per `contracts/sample-email-template.md`
- [X] T010 [US4] In `src/features/notifications/NotificationSettingsPanel.tsx`'s `ConfigForm` (~line 37): change `useState(config.template)` to `useState(config.template === "" ? DEFAULT_EVENT_REMINDER_TEMPLATE : config.template)` (import the constant from T009), per `contracts/sample-email-template.md` Resolution rule (depends on T009)

**Checkpoint**: User Story 4 is fully functional and independently testable.

---

## Phase 7: User Story 5 - See How Many Events Fall on a Calendar Date (Priority: P3)

**Goal**: A calendar date with events shows the exact event count instead of a generic presence emoji; dates with no events show nothing, unchanged.

**Independent Test**: Open the events calendar for a tree with a date having 2+ events — that date shows the number, not an emoji; a date with exactly 1 event shows "1"; a date with 0 events shows nothing; clicking any date still opens the existing popup with a matching event list.

### Implementation for User Story 5

- [X] T011 [US5] In `src/features/events/CalendarGrid.tsx` (~line 95, day-cell render): replace the `{hasEvents && <span aria-hidden="true">🎉</span>}` emoji indicator with `{hasEvents && <span>{events.length}</span>}` (or equivalent), leaving the existing `aria-label` (already includes the count) and click/popup behavior unchanged

**Checkpoint**: All five user stories are now independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all five stories.

- [X] T012 [P] Search `tests/unit/*` and `tests/e2e/*` for assertions tied to any of the old behaviors this feature changes — the 🎉 emoji, `IndividualNode.tsx`'s hardcoded "Thứ N..." tooltip string, `siblingOrderLabel`'s single-argument signature, unit-child sort order, or the empty-string email template default — and update any that break; fix any gaps found
- [X] T013 Run all `quickstart.md` validation scenarios end-to-end (depends on T002, T004, T007, T008, T010, T011) — including `npx tsc -b`, `npx eslint .`, `npx vitest run`, and `npm run build`; fix any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with any user story
- **User Story 1 (Phase 3)**: No dependency on any other story
- **User Story 2 (Phase 4)**: No dependency on any other story
- **User Story 3 (Phase 5)**: No dependency on any other story
- **User Story 4 (Phase 6)**: No dependency on any other story
- **User Story 5 (Phase 7)**: No dependency on any other story
- **Polish (Phase 8)**: Depends on all five user stories being complete

### Within User Story 2

- T003 (formatters.ts) and T004 (useTreeLayout.ts) touch different files and are independent of each other
- T005, T006, T007 each depend on T003 (the new `siblingOrderLabel` signature) but not on each other or on T004 — they touch three different files

### Within User Story 4

- T010 depends on T009 (the constant it imports)

### Parallel Opportunities

- All five user stories (T001-T002, T003-T007, T008, T009-T010, T011) can be built entirely in parallel by different people — verified disjoint file sets
- Within US2: T003 and T004 in parallel; then T005, T006, T007 in parallel once T003 lands
- Within US4: T009 first, then T010
- T012 (Polish) can run in parallel with T013 setup, though T013 itself should run last

---

## Parallel Example: Cross-Story

```bash
# Nothing blocks any story (Setup/Foundational are empty), so these can start together:
Task: "Create supabase/migrations/0016_import_row_results_admin_editor_update.sql"      # T001 (US1)
Task: "Add gender param to siblingOrderLabel() in src/lib/formatters.ts"                # T003 (US2)
Task: "Add Xem chi tiết Link in src/pages/Admin/TreeManagement.tsx"                      # T008 (US3)
Task: "Add DEFAULT_EVENT_REMINDER_TEMPLATE in src/features/notifications/notificationConfigService.ts"  # T009 (US4)
Task: "Replace emoji with count in src/features/events/CalendarGrid.tsx"                # T011 (US5)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T002)
2. **STOP and VALIDATE**: Confirm both the relationship-cascade delete and the zero-relationship import-created-individual delete now succeed
3. Deploy/demo if ready — this alone unblocks a previously hard-blocked core data-management action

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (sibling order + eldest label) → validate independently → deploy
3. Add User Story 3 (Xem chi tiết) → validate independently → deploy
4. Add User Story 4 (sample email template) → validate independently → deploy
5. Add User Story 5 (calendar event count) → validate independently → deploy
6. Polish (T012-T013) once all five are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
