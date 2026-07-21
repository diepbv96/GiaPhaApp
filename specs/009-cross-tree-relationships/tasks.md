# Tasks: Cross-Tree Relationship Visibility

**Input**: Design documents from `/specs/009-cross-tree-relationships/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md. Following this codebase's existing convention, this feature has no new pure client-side logic to unit test (research.md §1: it's a query-shape change, not new branching logic) — coverage is Playwright e2e only, consistent with `quickstart.md`'s "Automated coverage" section.

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

None required. The query-shape fix in User Story 1 is the entire foundation this feature rests on; there is no shared infrastructure step that isn't itself part of a user story's own implementation.

---

## Phase 3: User Story 1 - Relationship Follows Both Members Into a New Shared Tree (Priority: P1) 🎯 MVP

**Goal**: A relationship between two individuals is visible in every family tree where both are currently members, not only the tree it was originally recorded in — for authenticated users and unauthenticated guests alike.

**Independent Test**: Create two individuals in tree 1 with a recorded relationship, add both as members of tree 2, open tree 2, and confirm the relationship appears without being recreated (`quickstart.md` Scenario 1).

### Implementation for User Story 1

- [X] T001 [US1] In `src/features/tree/treeGraphService.ts`'s `getTreeGraph(treeId)`: replace the parallel `Promise.all` fetch with two sequential steps — (1) fetch member individuals exactly as today; (2) derive `memberIds` from the result and, if non-empty, fetch relationships with `.in("person_a_id", memberIds).in("person_b_id", memberIds)` instead of `.eq("family_tree_id", treeId)`; if `memberIds` is empty, skip the relationships query and use `[]`. Per `contracts/tree-graph-relationship-visibility.md` steps 1-4, `research.md` §1-§2.
- [X] T002 [P] [US1] Create `supabase/migrations/0023_relationship_cross_tree_visibility.sql`: rewrite the `relationships_public_select` policy (currently keyed off `relationships.family_tree_id`, from `0009_public_tree_access.sql`) to the membership-based check — visible to `anon` when there exists a public family tree where both `person_a_id` and `person_b_id` have an `individual_tree_memberships` row, mirroring the join shape `individual_tree_memberships_public_select` already uses (`0019_public_tree_membership_visibility.sql`). Per `data-model.md` Row Level Security section, `research.md` §3.
- [X] T003 [US1] E2E test in `tests/e2e/family-tree.spec.ts`, new `test.describe("Spec 009 - Cross-tree relationship visibility")`: a self-contained test that creates two individuals in the default tree, records a relationship, adds both to the seeded second tree ("Gia Phả Chi Nhánh Miền Nam (Mẫu)" — reused instead of creating a new tree, to stay well under the app's 5-tree limit under `fullyParallel`), opens the second tree, and asserts the relationship is rendered; also asserts it's unchanged back in the default tree. Within the same test, signs out and re-views the second tree as a guest — both seeded trees are already `is_public = true` (`supabase/seed/seed.sql`), so no is_public toggling is needed for the guest-parity check (`contracts/tree-graph-relationship-visibility.md` "Guest (anon) parity"). Signs back in at the end to clean up both individuals. Per `quickstart.md` Scenario 1 and "Guest parity check" (depends on T001, T002).

**Checkpoint**: User Story 1 is fully functional and independently testable — a relationship shared between two co-members of a tree is always visible in that tree, for both authenticated users and guests.

---

## Phase 4: User Story 2 - Relationship Stays Hidden When Only One Party Shares the Tree (Priority: P2)

**Goal**: A relationship is never shown in a tree unless both connected individuals are currently members of that specific tree — confirming T001's `.in().in()` filter doesn't over-show relationships across unrelated trees.

**Independent Test**: Add only one of two already-related individuals to a second tree and confirm the relationship does not appear there, while the individual still appears (isolated, per spec 008); adding the second individual afterward makes the relationship appear immediately (`quickstart.md` Scenario 2).

### Implementation for User Story 2

- [X] T004 [US2] E2E test in `tests/e2e/family-tree.spec.ts`, extending the Spec 009 describe block from T003: a self-contained test that creates two related individuals, adds only one of them to a second tree, opens that tree, and asserts the individual appears alone with no relationship line to the other — then adds the second individual to the same tree and asserts the relationship now appears. No implementation task: this is a regression/behavior test against T001's existing `.in("person_a_id", memberIds).in("person_b_id", memberIds)` filter, which already excludes any relationship where one endpoint isn't in `memberIds` (research.md §1). Per `quickstart.md` Scenario 2 (depends on T001).

**Checkpoint**: Both User Story 1 and User Story 2 are verified — relationship visibility correctly requires *both* endpoints to share the tree, not just one.

---

## Phase 5: User Story 3 - Removing a Shared Membership Elsewhere Doesn't Destroy the Relationship (Priority: P3)

**Goal**: Removing an individual's membership from one family tree never affects a relationship that remains valid in another family tree they still belong to.

**Independent Test**: With two individuals sharing tree 1 (where their relationship was recorded) and tree 2 (added later), remove one individual's membership from tree 2 only, then confirm the relationship is still shown in tree 1 (`quickstart.md` Scenario 3).

### Implementation for User Story 3

- [X] T005 [US3] E2E test in `tests/e2e/family-tree.spec.ts`, extending the Spec 009 describe block: a self-contained test that creates two related individuals in tree 1, adds both to tree 2, removes one individual's membership from tree 2 only (no relationship-cascade confirmation should be required, since the relationship was recorded in tree 1, not tree 2), then asserts tree 1 still shows the relationship unchanged and tree 2 no longer shows that individual at all. No implementation task: `removeIndividualFromTree`'s cascade scoping and the `enforce_no_relationships_before_membership_removal` trigger already key off the tree membership actually being removed, not other trees the pair shares (research.md §4) — this test is a regression guard confirming that stays true once T001 makes the relationship visible in more than one tree at a time. Per `quickstart.md` Scenario 3 (depends on T001).

**Checkpoint**: All three user stories are independently verified — visibility, correct scoping, and removal safety.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all three stories.

- [X] T006 [P] Search `tests/unit/*` and `tests/e2e/*` for any assertion that relies on the old `relationships.family_tree_id`-based filtering (e.g. expecting a relationship to be absent from a second tree once both individuals are members) — confirmed via grep, none found (research.md §4-§5 already trace every consumer; only `treeGraphService.ts`'s display query used it for scoping).
- [X] T007 Ran `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npm run build`, `npx playwright test --list` — record results and note the same no-live-Supabase-backend caveat as specs 007/008 (migration `0023` and the new e2e tests are verified for syntax/registration only, not executed against a real project).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with User Story 1
- **User Story 1 (Phase 3)**: No dependency on User Story 2 or 3
- **User Story 2 (Phase 4)**: Depends on User Story 1's query fix (T001) existing to have a behavior to verify
- **User Story 3 (Phase 5)**: Depends on User Story 1's query fix (T001) so the relationship is visible in more than one tree to begin with
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within User Story 1

- T001 (query fix) and T002 (RLS migration) touch different files with no dependency between them — can run in parallel
- T003 depends on both T001 and T002 (the guest-parity half of the test needs the RLS migration; the authenticated half needs the query fix)

### Within User Story 2 and User Story 3

- T004 depends on T001 only
- T005 depends on T001 only

### Parallel Opportunities

- T001 and T002 can run in parallel (different files: `treeGraphService.ts` vs. a new migration)
- T004 and T005 can be written in parallel once T001 lands (both extend the same describe block but are independent test cases)
- T006 (Polish) can start as soon as T001-T005 are far enough along to search against

---

## Parallel Example: User Story 1

```bash
# These can run in parallel:
Task: "Fix getTreeGraph() relationships query in src/features/tree/treeGraphService.ts"          # T001
Task: "Add relationships_public_select RLS rewrite in supabase/migrations/0023_...sql"           # T002
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T003)
2. **STOP and VALIDATE**: Confirm a relationship between two co-members of a tree is visible in that tree, for both authenticated users and guests
3. Deploy/demo if ready

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (negative-case regression test) → validate independently → deploy
3. Add User Story 3 (removal-safety regression test) → validate independently → deploy
4. Polish (T006-T007) once all three are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
- User Stories 2 and 3 are test-only (no implementation): both are guards confirming T001's single query change has the right boundaries, not separate features of their own — this is expected given how narrowly-scoped this fix is (research.md §4 found nothing else in the codebase needed to change)
