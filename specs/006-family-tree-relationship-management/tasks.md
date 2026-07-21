# Tasks: Family Tree Naming, Multi-Tree Membership & Relationship Management

**Input**: Design documents from `/specs/006-family-tree-relationship-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in spec.md; no dedicated per-story test-writing tasks are included, consistent with features 004/005's precedent. The Polish phase searches existing suites for assertions tied to changed behavior and runs the full existing suite plus `quickstart.md`.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths below are relative to the repository root; `@/` is the `src/` alias (`vite.config.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

None required. No new dependency or tooling config is needed (plan.md Technical Context: zero new npm packages).

---

## Phase 2: Foundational (Blocking Prerequisites)

None required. Each story's schema/infrastructure (the `individual_tree_memberships` table for US2, the `relationships` `UPDATE` policy for US1) is needed by exactly one story, not all of them — there is no shared abstraction all three stories depend on. Tree rename (US3) needs no new schema at all (research.md §1).

---

## Phase 3: User Story 1 - Manage a Person's Relationships Within One Family Tree (Priority: P1) 🎯 MVP

**Goal**: Admin/editor can add (already possible today), change the type of, and delete a specific person's relationships from the tree UI. The person-selection list for a new/edited relationship only ever shows people who belong to the same family tree.

**Independent Test**: Select a person, add a relationship (dropdown only lists people from the current tree), open another person's "Gia đình" section, change one existing relationship's type and confirm it saves, then delete a different relationship and confirm it disappears from both people's family lists and the tree canvas.

### Implementation for User Story 1

- [X] T001 [US1] Create `supabase/migrations/0018_relationships_admin_editor_update.sql` adding an `UPDATE` RLS policy `relationships_admin_editor_update` on `public.relationships` for `admin`/`editor` roles, mirroring the existing `relationships_admin_editor_delete` policy's `public.current_role_is(array['admin', 'editor']::user_role[])` check (`supabase/migrations/0007_rls_policies.sql`), per `contracts/relationship-management.md`
- [X] T002 [US1] Add `updateRelationship(id: string, type: RelationshipType): Promise<Relationship>` to `src/features/relationships/relationshipService.ts`, reusing `createRelationship`'s undirected-duplicate pre-check (for `spouse`/`sibling`, checking both `(a,b)`/`(b,a)` orderings, excluding the row's own `id`) and its `23505`→`CONFLICT` / `42501`→`PERMISSION_DENIED` error mapping, per `contracts/relationship-management.md` (depends on T001 to take effect end-to-end)
- [X] T003 [US1] Create `src/features/relationships/RelationshipTypeEditor.tsx` — props `{ relationship: Relationship; onSaved: (updated: Relationship) => void; onCancel: () => void }`; a `<select>` of the three `RelationshipType` values (reusing the `typeLabel` map style from `RelationshipForm.tsx`) preset to `relationship.type`; calls `updateRelationship(relationship.id, type)` on submit and invokes `onSaved` (depends on T002)
- [X] T004 [US1] In `src/features/individuals/IndividualDetailPanel.tsx`: add optional props `canManage?: boolean`, `onEditRelationship?: (relationship: Relationship, otherPerson: Individual) => void`, `onDeleteRelationship?: (relationship: Relationship, otherPerson: Individual) => void`; for each person rendered via the existing `PersonList` calls for `relations.parents`, `.spouses`, `.siblings`, `.biologicalChildren` (not `.inLawChildren`, which has no direct `Relationship` row — see `contracts/relationship-management.md` Non-goals), resolve the underlying `Relationship` row from `graph.relationships` by matching `(personAId, personBId)` against `(individual.id, person.id)` in either order, and render "Sửa"/"Xoá" buttons per row when `canManage` is true, calling the new callbacks with the resolved relationship and person
- [X] T005 [US1] In `src/features/tree/TreeWorkspace.tsx`: extend the `ModalState` union with `{ kind: "edit-relationship"; relationship: Relationship; otherPerson: Individual }`; pass `canManage`, `onEditRelationship={(relationship, otherPerson) => setModal({ kind: "edit-relationship", relationship, otherPerson })}`, and `onDeleteRelationship={(relationship) => deleteRelationship(relationship.id).then(refreshGraph)}` into `<IndividualDetailPanel>`; render a `Modal` containing `<RelationshipTypeEditor>` when `modal?.kind === "edit-relationship"`, calling `refreshGraph()` and `setModal(null)` on success (depends on T003, T004)

**Checkpoint**: User Story 1 is fully functional and independently testable — add/update/delete relationship all reachable from the UI. The same-tree-only selection list (FR-012/FR-013) needs no code change here — it already holds today by construction (research.md §4) and continues to hold whether or not US2 has shipped yet.

---

## Phase 4: User Story 2 - Assign a Person to More Than One Family Tree (Priority: P2)

**Goal**: A person can belong to more than one family tree. Adding/removing a tree membership doesn't affect the person's data or relationships in any other tree they belong to, and a person can never be left with zero family trees.

**Independent Test**: Take a person from Tree A, add them to Tree B via their detail panel, confirm they now appear in Tree B's canvas with no relationships shown there; confirm Tree A's data for them is unchanged; confirm removing their only remaining membership is blocked; confirm a signed-out guest viewing a public tree never sees any indication of the person's other tree(s).

### Implementation for User Story 2

- [X] T006 [US2] Create `supabase/migrations/0017_individual_tree_memberships.sql` — new `individual_tree_memberships` table (`individual_id`, `family_tree_id`, `created_at`, composite primary key), a backfill `insert` from existing `individuals` rows, the `seed_individual_primary_tree_membership()` `AFTER INSERT ON individuals` trigger, the `enforce_last_tree_membership()` `BEFORE DELETE` trigger, the rewritten `enforce_relationship_same_tree()` function (checking membership instead of `individuals.family_tree_id`), and RLS (`select` for any authenticated profile, `insert`/`delete` for admin/editor, **no** `anon` policy) — exact SQL in `contracts/tree-membership.md`
- [X] T007 [P] [US2] In `src/features/tree/treeGraphService.ts`: change `getTreeGraph()`'s individuals query from `.eq("family_tree_id", treeId)` to the embedded-filter form ``select(`${INDIVIDUAL_COLUMNS}, individual_tree_memberships!inner(family_tree_id)`).eq("individual_tree_memberships.family_tree_id", treeId)``, per `contracts/tree-membership.md` (depends on T006)
- [X] T008 [P] [US2] Create `src/features/individuals/treeMembershipService.ts` exporting `getIndividualTreeMemberships(individualId): Promise<FamilyTreeSummary[]>`, `addIndividualToTree(individualId, treeId): Promise<void>`, and `removeIndividualFromTree(individualId, treeId, opts?: { cascadeRelationships?: boolean }): Promise<void>`, with the exact query shapes and error mappings (`23505`→"đã là thành viên", `LAST_TREE_MEMBERSHIP` message match→"đây là cây gia phả duy nhất", `23503`→cascade-confirmation `CONFLICT`) in `contracts/tree-membership.md` (depends on T006)
- [X] T009 [US2] Create `src/features/individuals/ManageTreeMembershipDialog.tsx` — props `{ individual: Individual; onClose: () => void }`; loads `getIndividualTreeMemberships` + `getFamilyTrees` to compute the "add to" list (all trees minus current memberships); renders current memberships with a "Xoá khỏi cây này" button disabled when it's the only one; add/remove call `addIndividualToTree`/`removeIndividualFromTree` (prompting for cascade confirmation first, reusing `DeleteIndividualDialog`'s confirm-checkbox pattern, when removal would hit relationships in that tree), per `contracts/tree-membership.md` (depends on T008)
- [X] T010 [US2] In `src/features/individuals/IndividualDetailPanel.tsx`: add a "Thêm vào cây gia phả khác" action (new prop `onManageTreeMemberships?: (individual: Individual) => void`, rendered alongside the existing per-person actions, gated on `canManage`) to open `ManageTreeMembershipDialog` for the selected individual (depends on T009; touches the same file as T004 from US1 — apply after T004 if both are in flight, to avoid a merge conflict on the same component)
- [X] T011 [US2] In `src/features/tree/TreeWorkspace.tsx`: extend `ModalState` with `{ kind: "manage-tree-membership"; individual: Individual }`; wire `onManageTreeMemberships` into `setModal(...)`; render `<ManageTreeMembershipDialog>` in a `Modal` when active, invalidating `["tree-graph"]` (all trees, since membership changes can add/remove the person from any tree's canvas) on close (depends on T009, T010; touches the same file as T005 from US1 — apply after T005)

**Checkpoint**: User Story 2 is fully functional and independently testable — FR-004–FR-008, FR-016, and FR-017/SC-006 (from `/speckit-clarify`) all hold.

---

## Phase 5: User Story 3 - Rename an Existing Family Tree (Priority: P3)

**Goal**: An admin can rename an existing family tree after creation; editors/viewers cannot.

**Independent Test**: As admin, rename a tree and confirm the new name shows on the management list, the home sidebar, and the tree's own page. As editor, confirm no rename action is available (the management page itself is unreachable — `RequireRole allow={["admin"]}` on `/quan-tri/cay-gia-pha`, `src/app/router.tsx`).

### Implementation for User Story 3

- [X] T012 [P] [US3] Add `updateFamilyTreeName(treeId: string, name: string): Promise<FamilyTreeSummary>` to `src/features/trees/treeService.ts`, mirroring `updateTreeSlug`'s request/error-mapping shape (`23514`→`VALIDATION_FAILED` "Tên cây gia phả không được để trống.", `42501`→`PERMISSION_DENIED` "Chỉ quản trị viên mới có thể sửa tên cây gia phả."), per `contracts/tree-name-edit.md`
- [X] T013 [US3] Create `src/features/trees/TreeNameField.tsx` mirroring `SlugField.tsx`'s props/structure (`{ treeId, currentName, onSaved?, onCancel? }`, trim-on-submit, Save disabled when unchanged/empty or pending), calling `updateFamilyTreeName`, per `contracts/tree-name-edit.md` (depends on T012)
- [X] T014 [US3] In `src/pages/Admin/TreeManagement.tsx`: add a `nameEditTarget` state (mirroring the existing `slugEditTarget`), a "✏️ Sửa tên" button per tree list item (next to "✏️ Sửa slug"), and a `Modal` rendering `<TreeNameField>` when set — exact same wiring pattern as the existing slug-edit modal (depends on T013)

**Checkpoint**: All three user stories are now independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all three stories.

- [X] T015 [P] Search `tests/unit/*` and `tests/e2e/*` for assertions tied to any of the old behaviors this feature changes — `getTreeGraph`'s individuals query shape, the absence of relationship edit/delete controls, `TreeManagement.tsx`'s action-button list — and update any that break; fix any gaps found
- [X] T016 Run all `quickstart.md` validation scenarios end-to-end (depends on T005, T011, T014) — including `npx tsc -b`, `npx eslint .`, `npx vitest run`, and `npm run build`; fix any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: Empty — start directly with any user story
- **User Story 1 (Phase 3)**: No dependency on any other story
- **User Story 2 (Phase 4)**: No dependency on any other story
- **User Story 3 (Phase 5)**: No dependency on any other story
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within User Story 1

- T001 (migration) before T002 (service function that needs the policy to actually take effect)
- T002 before T003 (the component that imports/calls it)
- T003 and T004 touch different files and are independent of each other; T005 depends on both

### Within User Story 2

- T006 (migration) before T007 and T008 (both query against tables/columns T006 creates)
- T007 and T008 touch different files and are independent of each other
- T008 before T009 (the dialog that calls it); T009 before T010; T010 before T011

### Cross-story file overlap (not a story dependency, but a sequencing note)

- `src/features/individuals/IndividualDetailPanel.tsx` is touched by both T004 (US1) and T010 (US2) — apply one story's change and land it before starting the other's to avoid a merge conflict, even though the two stories are functionally independent.
- `src/features/tree/TreeWorkspace.tsx` is touched by both T005 (US1) and T011 (US2) — same note.

### Parallel Opportunities

- T001 (US1 migration), T006 (US2 migration), and T012 (US3 service function) touch entirely disjoint files with no dependency between them — all three can start immediately, in parallel, by different people
- Within US1: T003 and T004 can be built in parallel once T002 lands (T003 depends on T002; T004 doesn't depend on T002 or T003 at all, so it can actually start immediately alongside T001/T002)
- Within US2: T007 and T008 in parallel once T006 lands

---

## Parallel Example: Cross-Story

```bash
# Nothing blocks any story (Setup/Foundational are empty), so these can start together:
Task: "Create supabase/migrations/0018_relationships_admin_editor_update.sql"   # T001 (US1)
Task: "Create supabase/migrations/0017_individual_tree_memberships.sql"        # T006 (US2)
Task: "Add updateFamilyTreeName() in src/features/trees/treeService.ts"        # T012 (US3)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T005)
2. **STOP and VALIDATE**: Confirm add/update/delete relationship all work from the UI, and the person-selection list still only shows same-tree people
3. Deploy/demo if ready

### Incremental Delivery

1. User Story 1 (MVP) → validate → deploy
2. Add User Story 2 (multi-tree membership) → validate independently → deploy
3. Add User Story 3 (tree rename) → validate independently → deploy
4. Polish (T015-T016) once all three are in

### Notes

- `[P]` tasks touch different files with no unmet dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before moving on
- See "Cross-story file overlap" above before running US1 and US2 truly in parallel across two people
