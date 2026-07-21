# Tasks: Individuals Admin Dashboard

**Input**: Design documents from `/specs/007-individuals-admin-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md. This codebase's existing convention (confirmed by research.md and by every current `tests/unit/*` file) is: pure-logic helpers get Vitest unit tests; Supabase-backed service functions and DB-trigger behavior have no mocked-unit-test precedent anywhere in the repo and are validated via Playwright e2e against the seeded dev instance instead. Task list follows that same split rather than inventing new mocking infrastructure.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths below are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

None required. No new dependency or tooling config is needed (plan.md Technical Context: zero new npm packages).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure two or more stories depend on.

- [X] T001 Created `supabase/migrations/0021_individuals_admin_search_and_delete_fix.sql`: (a) `full_name_normalized`/`alias_normalized` generated, stored, indexed columns; (b) `enforce_last_tree_membership()` existence guard. **Fixed post-review**: the first version called `extensions.unaccent()` directly inside the generated column expressions, which the user's own project rejected with `42P17: generation expression is not immutable` (`unaccent()` is `stable`, not `immutable`, and a generated column's expression — unlike a wrapper function — gets no benefit of the doubt from Postgres). Added `public.normalize_search_text()`, an explicitly `immutable` SQL wrapper (same pattern `slugify_tree_name()` already relies on), and pointed both generated columns at it instead. Not yet re-verified against a live database after this fix — re-run the migration and confirm it applies cleanly. Per `contracts/individuals-list-search.md`, `contracts/individual-delete-everywhere.md`, `research.md` §2 (including its Correction note) and §4.
- [X] T002 Added the `PGRST116` → `NOT_FOUND` case to `toDataAccessError()` in `src/features/individuals/individualService.ts`, exactly as specified. Per `contracts/individual-edit.md`, `contracts/individual-delete-everywhere.md`, `research.md` §5.

**Checkpoint**: Foundation ready — all three user stories can now proceed.

---

## Phase 3: User Story 1 - Browse and Locate Any Individual (Priority: P1) 🎯 MVP

**Goal**: Admin/editor can open a dedicated dashboard page listing every individual across every family tree, filter by a single tree, search by name/alias (diacritic-tolerant), combine both, see a clear "no results" state, and have the page itself be unreachable by viewers/unauthenticated users.

**Independent Test**: Open `/quan-tri/ca-nhan` as admin — confirm individuals from more than one tree appear together; apply the tree filter alone, the search alone, and both together, confirming the list narrows correctly each time; clear both and confirm the full list returns; attempt to open the same URL as a viewer and confirm access is denied.

### Implementation for User Story 1

- [X] T003 [P] [US1] Created `src/lib/useDebouncedValue.ts` exactly as specified. Per `research.md` §3.
- [X] T004 [P] [US1] Created `src/features/individuals/individualSearch.ts` exporting `normalizeSearchTerm()`, reusing `slug.ts`'s diacritic-stripping technique. Per `research.md` §2.
- [X] T005 [P] [US1] Added `IndividualWithTrees` and `IndividualsAdminPage` to `src/types/index.ts`, per `data-model.md`.
- [X] T006 [US1] Added `listIndividualsAdmin()` to `src/features/individuals/individualService.ts` — two-query shape (selection + membership-display) exactly per `contracts/individuals-list-search.md`. One implementation deviation from the literal task text: the selection query's `individual_tree_memberships!inner(...)` embed is always included (not conditionally, based on whether `treeId` is set) — this was necessary because a ternary between two different `.select()` string literals broke supabase-js's compile-time literal-string type parser (`ParserError`); since every individual always has ≥1 membership row (existing DB invariant), an unconditional `!inner` join is a no-op filter-wise when no `.eq()` is added, so behavior is unaffected. `tsc -b` passes clean.
- [X] T007 [US1] Added route `/quan-tri/ca-nhan` in `src/app/router.tsx` exactly as specified.
- [X] T008 [US1] Created `src/pages/Admin/IndividualsManagement.tsx` exactly as specified (search box, tree filter, paginated list, no-results state). Per-row buttons are labeled "Sửa" and "Xoá cá thể" (not bare "Xoá") to avoid an accessible-name collision with `DeleteIndividualDialog`'s own "Xoá" confirm button. Per `contracts/individuals-list-search.md`.
- [X] T009 [P] [US1] Created `tests/unit/individualSearch.test.ts` — 5 cases, all passing (`npx vitest run`).
- [X] T010 [US1] Added `tests/e2e/individuals-admin-dashboard.spec.ts` with `test.describe("User Story 1 - Browse and locate any individual")` covering multi-tree listing, filter, diacritic-insensitive search, combined filter+search, no-results, and viewer/unauthenticated access denial. Verified with `npx playwright test --list` (registers correctly, 35 tests total across the repo); **not executed** — no `.env`/live Supabase backend configured in this sandbox. Per `quickstart.md` User Story 1.

**Checkpoint**: User Story 1 is fully functional and independently testable — the dashboard exists, lists, filters, searches, and is properly access-gated.

---

## Phase 4: User Story 2 - Edit an Individual's Information from the Dashboard (Priority: P2)

**Goal**: Admin/editor can open an edit form for any listed individual directly from the dashboard, save valid changes (reflected immediately in the list and in any tree canvas), have invalid submissions rejected with a clear message, and cancel without side effects.

**Independent Test**: From the dashboard list, edit an individual's alias and save — confirm the row updates immediately and the same change is visible in that person's tree canvas view; attempt to save a blank required name and confirm rejection; open the form and cancel, confirming no change persisted.

### Implementation for User Story 2

- [X] T011 [US2] Added the "Sửa" action to `src/pages/Admin/IndividualsManagement.tsx` exactly as specified — `IndividualForm` reused unmodified, `treeId` satisfied by `editTarget.familyTreeId` (a real, harmless value; never read in edit mode per `research.md` §6), `existingIndividuals` omitted. Invalidates `["individuals", "admin"]` and `["tree-graph"]` on success. Per `contracts/individual-edit.md`.
- [X] T012 [US2] Added `test.describe("User Story 2 - Edit an individual's information from the dashboard")` to `tests/e2e/individuals-admin-dashboard.spec.ts` covering save-reflects-immediately, blank-name-rejected, and cancel-leaves-unchanged. Verified with `npx playwright test --list`; **not executed** (same no-live-backend caveat as T010). Per `quickstart.md` User Story 2.

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Delete an Individual from the Dashboard (Priority: P3)

**Goal**: Admin/editor can permanently delete any listed individual from the dashboard — removed from every family tree they belong to and every relationship referencing them — after an explicit confirmation that states exactly what will be removed, including for individuals who belong to more than one family tree.

**Independent Test**: Delete an individual with zero relationships and confirm they disappear from the dashboard and their tree's canvas; add a different individual to a second family tree, then delete them from the dashboard and confirm they disappear from *every* tree's canvas, not just one (the multi-tree trigger-fix regression case); attempt to delete an already-deleted individual and confirm a "no longer exists" message rather than a false success.

### Implementation for User Story 3

- [X] T013 [US3] Added the existence pre-check per the original spec. **Superseded during manual testing**: deleting a *zero-relationship* individual (previously created via bulk `.xlsx` import) still failed with `23503` on `import_row_results_individual_id_fkey`, misreported as "vẫn còn mối quan hệ" — a real bug in `deleteIndividual()`'s original three-separate-request shape, not something T001's trigger fix covered. Fixed by adding migration `0022_delete_individual_everywhere.sql` (a `security invoker` RPC consolidating existence-check + relationship-cascade + `import_row_results` nulling + the final delete into one atomic transaction, mirroring `set_default_family_tree()`) and rewriting `deleteIndividual()` in `src/features/individuals/individualService.ts` to call it. See `research.md` §8, `data-model.md`'s `delete_individual_everywhere` section, and the revised `contracts/individual-delete-everywhere.md`.
- [X] T014 [US3] Extended `DeleteIndividualDialog.tsx`'s confirmation copy (both the has-relationships and zero-relationships branches) to state removal from every family tree the individual belongs to. Per `contracts/individual-delete-everywhere.md`.
- [X] T015 [US3] Added the "Xoá cá thể" action to `src/pages/Admin/IndividualsManagement.tsx` — system-wide `relationshipCount` via a new `getRelationshipCountForIndividual()` in `src/features/relationships/relationshipService.ts` (no existing function covered this; added per `contracts/individual-delete-everywhere.md`'s "Relationship count source" section), `DeleteIndividualDialog` reused with `cascadeRelationships: true` always passed by the dialog itself when relationships exist. Invalidates the list and `["tree-graph"]` on success.
- [X] T016 [US3] Added `test.describe("User Story 3 - Delete an individual from the dashboard")` to `tests/e2e/individuals-admin-dashboard.spec.ts` — 4 tests: simple delete, multi-tree delete (trigger-fix regression, using `page.evaluate` to pre-delete a row and simulate a concurrent deletion for the NOT_FOUND case), and viewer access denial. Verified with `npx playwright test --list`; **not executed** (same no-live-backend caveat as T010/T012). Per `quickstart.md` User Story 3.

**Checkpoint**: All three user stories are now independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all three stories.

- [X] T017 [P] Searched `tests/unit/*` and `tests/e2e/*` for assertions tied to `individualService.ts`'s error mapping or `DeleteIndividualDialog.tsx`'s exact copy — none found (only the unaffected checkbox label is referenced anywhere, by spec 008's new e2e test). No updates needed.
- [X] T018 Ran `npx tsc -b` (clean), `npx eslint .` (0 errors, 4 pre-existing warnings unrelated to this change), `npx vitest run` (92/92 tests pass across 13 files), `npm run build` (succeeds), all re-confirmed after the T013 RPC fix. `npx playwright test --list` confirms all 35 e2e tests parse and register correctly; full `npx playwright test` execution was **not run** — this sandbox has no `.env`/live Supabase project, so e2e tests cannot authenticate. Migrations `0021` and `0022` were applied by the user against their real project during manual testing, which is precisely what surfaced the T013 bug in the first place. Recommend, before merging: re-run `npm run test:e2e` against that project, covering both the multi-tree delete regression (trigger fix, `0021`) and a zero-relationship, import-created individual's delete (RPC fix, `0022`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty
- **Foundational (Phase 2)**: T001, T002 — BLOCKS US1's search (T006) and US2/US3's NOT_FOUND handling (T011 depends on T002 transitively via `updateIndividual`; T013 depends on T002 directly)
- **User Story 1 (Phase 3)**: Depends on Foundational T001 (search columns) — no dependency on US2/US3
- **User Story 2 (Phase 4)**: Depends on Foundational T002 and on US1's page shell (T008) existing to attach its action to — no dependency on US3
- **User Story 3 (Phase 5)**: Depends on Foundational T001/T002 and on US1's page shell (T008) — no dependency on US2
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within User Story 1

- T003, T004, T005 touch different files and have no dependency on each other — all three can start immediately, in parallel
- T006 depends on T001 (search columns) and T005 (return type)
- T007 has no dependency on T003–T006 and can start immediately
- T008 depends on T003, T004, T006, T007
- T009 depends only on T004 (can run in parallel with T005–T008)
- T010 depends on T008

### Within User Story 2

- T011 depends on T008 (US1) and T002 (Foundational)
- T012 depends on T011

### Within User Story 3

- T013 depends on T002 (Foundational)
- T014 has no code dependency (can run in parallel with T013)
- T015 depends on T008 (US1), T013, T014
- T016 depends on T015

### Cross-story file overlap (not a story dependency, but a sequencing note)

- `src/pages/Admin/IndividualsManagement.tsx` is touched by T008 (US1), T011 (US2), and T015 (US3) — land each story's change in order (US1 → US2 → US3) to avoid merge conflicts, even though the stories are functionally independent once T008 exists.
- `tests/e2e/individuals-admin-dashboard.spec.ts` is extended by T010, T012, T016 — same note.

### Parallel Opportunities

- T001 and T002 (Foundational) touch different files and can run in parallel
- T003, T004, T005, T007 (US1) touch different files with no dependency between them — all four can start immediately, in parallel
- T009 can run in parallel with T005–T008 (depends only on T004)
- T014 (US3) can run in parallel with T013 (US3)

---

## Parallel Example: Foundational + User Story 1 kickoff

```bash
# After Setup (empty), these can start together:
Task: "Create supabase/migrations/0021_individuals_admin_search_and_delete_fix.sql"     # T001
Task: "Add PGRST116 -> NOT_FOUND mapping in individualService.ts's toDataAccessError()"  # T002
Task: "Create src/lib/useDebouncedValue.ts"                                              # T003 (US1)
Task: "Create src/features/individuals/individualSearch.ts"                             # T004 (US1)
Task: "Add IndividualWithTrees/IndividualsAdminPage types in src/types/index.ts"         # T005 (US1)
Task: "Add /quan-tri/ca-nhan route in src/app/router.tsx"                                # T007 (US1)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T002)
2. Complete Phase 3: User Story 1 (T003-T010)
3. **STOP and VALIDATE**: Confirm the dashboard lists, filters, and searches correctly, and is properly access-gated
4. Deploy/demo if ready

### Incremental Delivery

1. Foundational + User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (edit) → validate independently → deploy
3. Add User Story 3 (delete) → validate independently → deploy
4. Polish (T017-T018) once all three are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
- See "Cross-story file overlap" above before working on more than one story in parallel across multiple people
