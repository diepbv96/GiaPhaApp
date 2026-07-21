# Tasks: Display Individuals Without Relationships in Their Family Trees

**Input**: Design documents from `/specs/008-display-unconnected-individuals/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md. Following this codebase's existing convention, the one genuinely new pure-logic helper gets a Vitest unit test; the layout hook gets an extended case using its existing test file; behavior that can only be observed through the rendered canvas is validated via Playwright e2e, consistent with there being no existing `TreeCanvas`-level unit test anywhere in the repo (research.md §8).

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P2) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependency)
- **[Story]**: Which user story this task belongs to (US1–US2)
- File paths below are relative to the repository root

---

## Phase 1: Setup (Shared Infrastructure)

None required. No new dependency, migration, or tooling config is needed (plan.md Technical Context: zero new npm packages, no storage change).

---

## Phase 2: Foundational (Blocking Prerequisites)

None required. The fix is entirely User Story 1's own implementation (removing the exclusion); User Story 2 only adds a visual layer on top of what US1 makes visible — there is no shared infrastructure step that isn't itself part of one of the two stories.

---

## Phase 3: User Story 1 - A Tree Member With No Relationships Still Appears in That Tree (Priority: P1) 🎯 MVP

**Goal**: Every individual who is a member of a family tree is rendered on that tree's canvas, regardless of whether they currently have any relationship recorded in that specific tree — whether they were just added to the tree, just created with no relationship yet, or just had their last relationship in that tree removed.

**Independent Test**: Add an individual who already has relationships in Tree 1 to Tree 2 with no relationship created there; open Tree 2's canvas and confirm they appear. Separately, remove an individual's only relationship in a tree and confirm they remain visible afterward instead of disappearing.

### Implementation for User Story 1

- [X] T001 [US1] In `src/features/tree/TreeCanvas.tsx`: extract the existing relationship-adjacency computation into a pure, exported helper `computeIsolatedIds(graph: TreeGraph): Set<string>` (same logic as today's `connectedIds` construction, repurposed from "which individuals to keep" to "which individuals to flag"). Replace the old filtering `connectedGraph` memo: `displayGraph` now derives from the raw `graph` prop (with the existing in-law filter still chained on top when `hideInLaws` is on), so no individual is ever removed from what's laid out/rendered for having zero relationships. In the `nodes` memo, set `data.isIsolated = isolatedIds.has(individual.id)` for every node built. Update the stale code comment (currently citing spec 006 US2 acceptance scenario 1) to describe the new behavior and reference spec 008. Add `isIsolated: boolean` to the `IndividualNodeData` interface in `src/features/tree/IndividualNode.tsx` (interface only — visual rendering added in User Story 2). Per `contracts/isolated-individual-display.md` steps 1-5, `research.md` §1.
- [X] T002 [P] [US1] Unit test (co-located with wherever `computeIsolatedIds` is exported from, e.g. `tests/unit/computeIsolatedIds.test.ts`): an individual with zero relationships is included in the result; an individual referenced by a relationship is excluded; an empty-relationships graph returns every individual; an empty-individuals graph returns an empty set.
- [X] T003 [P] [US1] Extend `tests/unit/useTreeLayout.test.ts` with a mixed-graph case: a connected couple (spouse relationship) plus one additional individual with zero relationships, all passed to `useTreeLayout` together — assert the isolated individual receives a valid computed position as its own root unit, alongside (not instead of) the connected unit's layout, confirming the hook already handles the mixed case correctly once it receives the unfiltered graph (research.md §2).
- [X] T004 [US1] E2E test in `tests/e2e/family-tree.spec.ts`, new `test.describe("Spec 008 - Isolated individuals remain visible and actionable")`: creates a brand-new, self-contained individual with zero relationships and asserts it's shown on the canvas, then cleans itself up — written as an independent, `fullyParallel`-safe test (self-contained rather than mutating shared seed fixtures like the original task description's cross-tree scenario, to avoid races with other parallel tests). Verified with `npx playwright test --list` (parses/registers correctly); **not executed** — no `.env`/live Supabase backend is configured in this environment, so actual pass/fail could not be confirmed here. Per `quickstart.md` User Story 1 (depends on T001).

**Checkpoint**: User Story 1 is fully functional and independently testable — isolated individuals are never silently excluded from a tree's canvas.

---

## Phase 4: User Story 2 - Notice and Act on a Tree Member With No Relationships (Priority: P2)

**Goal**: An isolated individual's card is visually distinguishable from a connected individual's card, and remains fully selectable — opening the same detail panel and the same existing add-relationship/delete actions available for any other individual, for both admin/editor (full access) and viewer (read-only, same as any other individual).

**Independent Test**: Open a tree containing both a connected individual and an isolated one; confirm they look visually different; select the isolated one and confirm the detail panel opens showing no relationships and that "Thêm mối quan hệ" and "Xoá cá thể" both work exactly as for any other individual; repeat as a viewer and confirm no action controls appear.

### Implementation for User Story 2

- [X] T005 [US2] In `src/features/tree/IndividualNode.tsx`: add a new visual treatment rendered only when `data.isIsolated` is true (e.g. a dashed border in place of the existing solid gender-colored border, plus a small badge/label such as "Chưa có mối quan hệ"), following the same `Record<...>`-lookup-plus-conditional-render pattern already used for the gender, living/deceased, and sibling-order states in this file. Must not depend on color alone for distinguishability (FR-005/SC-003). Per `contracts/isolated-individual-display.md` step 6 (depends on T001 for the `isIsolated` field to exist).
- [X] T006 [US2] E2E tests in `tests/e2e/family-tree.spec.ts`, extending the describe block added in T004 with two more self-contained tests: (1) creates its own isolated individual, asserts the visual marker, opens the detail panel, uses "Thêm mối quan hệ" to link it to the seeded "Bùi Văn Cha" (read-only reference), confirms the marker disappears, then cleans up via "Xoá cá thể"; (2) signs in as `viewer@giapha.test`, reads the second seeded tree's slug via the app's own Supabase client, navigates there, and confirms the naturally-isolated seeded "Bùi Thị Út" shows the marker with no action buttons. Verified with `npx playwright test --list`; **not executed** — same no-live-backend caveat as T004. Per `quickstart.md` User Story 2 (depends on T005, T004).

**Checkpoint**: Both user stories are now independently functional — isolated individuals are visible, distinguishable, and fully actionable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across both stories.

- [X] T007 [P] Search `tests/unit/*` and `tests/e2e/*` for any assertion that currently relies on isolated individuals being hidden from a tree canvas — re-confirmed via grep (`connectedGraph`/`connectedIds`), none found, consistent with research.md §8.
- [X] T008 Ran `npx tsc -b` (clean), `npx eslint .` (0 errors, 4 pre-existing warnings unrelated to this change), `npx vitest run` (87/87 tests pass across 12 files, including the two new/extended files), `npm run build` (succeeds). `npx playwright test --list` confirms all e2e specs (including the 3 new ones) parse and register correctly; full `npx playwright test` execution was **not run** — this sandbox has no `.env` / live Supabase project configured (only `.env.example`), so e2e tests cannot authenticate. Recommend running `npm run test:e2e` against a real dev/staging Supabase project before merging.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with User Story 1
- **User Story 1 (Phase 3)**: No dependency on User Story 2
- **User Story 2 (Phase 4)**: Depends on User Story 1's `isIsolated` field and filter removal (T001) existing to have anything to render/test against
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within User Story 1

- T001 is the only implementation task; T002 and T003 depend on it (T002 needs the extracted helper to exist as an importable export; T003 needs the layout hook to actually be exercised with a mixed graph, which is independent of T001's TreeCanvas change but validates the same underlying assumption) — T002 and T003 can run in parallel with each other once T001 lands
- T004 depends on T001

### Within User Story 2

- T005 depends on T001 (US1)
- T006 depends on T005 and on T004's fixture/describe block (US1)

### Parallel Opportunities

- T002 and T003 can run in parallel once T001 lands (different files)
- T007 (Polish) can start as soon as T001-T006 are far enough along to search against; no code dependency of its own

---

## Parallel Example: User Story 1 tests

```bash
# Once T001 lands, these can run in parallel:
Task: "Unit test computeIsolatedIds in tests/unit/computeIsolatedIds.test.ts"          # T002
Task: "Extend tests/unit/useTreeLayout.test.ts with a mixed connected/isolated case"    # T003
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T004)
2. **STOP and VALIDATE**: Confirm isolated individuals are no longer excluded from any tree's canvas
3. Deploy/demo if ready

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (visual distinction + confirm actions work) → validate independently → deploy
3. Polish (T007-T008) once both are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
- This is a small, single-module change — no cross-story file-overlap concerns beyond the shared e2e spec file, noted in each task's dependency above
