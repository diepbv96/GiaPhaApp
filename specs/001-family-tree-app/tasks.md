# Tasks: Bùi Family Genealogy Tree (Gia Phả)

**Input**: Design documents from `/specs/001-family-tree-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Not explicitly requested in the spec; no per-story TDD test tasks are included. Automated test setup and coverage are addressed as Polish-phase tasks (T050, T051) instead.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are relative to the repository root

## Path Conventions

Single frontend SPA against Supabase (no custom backend), per `plan.md` Structure Decision:

- App code: `src/`
- Supabase schema/policies: `supabase/migrations/`, `supabase/seed/`
- Tests: `tests/unit/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic tooling

- [X] T001 Initialize Vite + React 18 + TypeScript project scaffold with core dependencies (`react-router-dom`, `@supabase/supabase-js`, `@tanstack/react-query`, `@xyflow/react`, `d3-hierarchy`, `xlsx`, `html-to-image`, `jspdf`, `react-hook-form`, `zod`) — `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`
- [X] T002 [P] Configure Tailwind CSS with bright/high-contrast theme tokens and a Vietnamese-diacritic-friendly font in `tailwind.config.ts` and `src/styles/theme.css`
- [X] T003 [P] Configure ESLint + Prettier for TypeScript/React in `.eslintrc.cjs` and `.prettierrc`
- [X] T004 [P] Create `.env.example` documenting `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` and add `.env` to `.gitignore`
- [X] T005 [P] Initialize Supabase project scaffolding: `supabase/config.toml` and empty `supabase/migrations/` directory
- [X] T006 [P] Configure Vitest + React Testing Library (`vitest.config.ts`) and Playwright (`playwright.config.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, auth/session context, and app shell that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create migration for enums (`person_gender`, `date_precision`, `relationship_type`, `user_role`, `import_row_status`) in `supabase/migrations/0001_enums.sql`
- [X] T008 Create migration for `profiles` table plus a trigger that auto-creates a profile row on `auth.users` insert (default role `viewer`) in `supabase/migrations/0002_profiles.sql` (depends on T007)
- [X] T009 Create migration for `family_trees` table including a partial unique index enforcing at most one `is_default = true` row and a trigger blocking a 6th tree (FR-016/FR-017/FR-018) in `supabase/migrations/0003_family_trees.sql` (depends on T008)
- [X] T010 Create migration for `individuals` table including the `CHECK (char_length(notes) <= 100)` constraint (FR-007) in `supabase/migrations/0004_individuals.sql` (depends on T007, T009)
- [X] T011 Create migration for `relationships` table including the `person_a_id <> person_b_id` check and duplicate-edge unique constraint in `supabase/migrations/0005_relationships.sql` (depends on T010)
- [X] T012 Create migration for `import_batches` and `import_row_results` tables in `supabase/migrations/0006_import_batches.sql` (depends on T008, T009)
- [X] T013 Create migration enabling Row Level Security and adding the role-based policies from `data-model.md` on all tables in `supabase/migrations/0007_rls_policies.sql` (depends on T008, T009, T010, T011, T012)
- [X] T014 [P] Create the Supabase client singleton reading `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in `src/lib/supabase.ts` (depends on T001, T004)
- [X] T015 [P] Define shared TypeScript types mirroring `data-model.md` entities in `src/types/index.ts` (depends on T001)
- [X] T016 Implement `AuthContext` exposing the current session and role (`getCurrentUserRole`) in `src/features/auth/AuthContext.tsx` (depends on T014, T015)
- [X] T017 Implement `authService` (`signIn`, `signOut`) and the Login page in `src/features/auth/authService.ts` and `src/pages/Login.tsx` (depends on T016)
- [X] T018 Implement the `RequireRole` route-guard component used to gate Admin/Editor-only routes and controls in `src/features/auth/RequireRole.tsx` (depends on T016)
- [X] T019 Wire the app shell — router, React Query provider, `AuthProvider` — in `src/app/App.tsx` and `src/app/router.tsx` (depends on T016, T017, T018)

**Checkpoint**: Database schema and auth/session foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - View the family tree and explore relationships (Priority: P1) 🎯 MVP

**Goal**: Any signed-in user opens the app, sees the default tree rendered with expand/collapse, can inspect an individual's full profile, and can export/print the current view.

**Independent Test**: Sign in as `viewer`; confirm the default tree renders on the home page; confirm expand/collapse and detail-panel viewing work; confirm export produces a file matching the current view — all without any create/edit/delete/import/tree-management UI existing yet.

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement read-only tree listing (`getFamilyTrees`, `getDefaultFamilyTree`) in `src/features/trees/treeService.ts` (depends on T014)
- [X] T021 [P] [US1] Implement `getTreeGraph(treeId)` (fetches individuals + relationships for a tree) in `src/features/tree/treeGraphService.ts` (depends on T014, T015)
- [X] T022 [US1] Implement the D3-hierarchy layout hook that computes node positions from the tree graph in `src/features/tree/useTreeLayout.ts` (depends on T021)
- [X] T023 [P] [US1] Implement the custom React Flow node component (avatar, full name, alias, gender styling) in `src/features/tree/IndividualNode.tsx` (depends on T015)
- [X] T024 [P] [US1] Implement custom React Flow edge components that visually distinguish parent-child / spouse / sibling relationships (FR-023) in `src/features/tree/RelationshipEdge.tsx` (depends on T015)
- [X] T025 [P] [US1] Implement the expand/collapse state hook (per-node visibility, hides descendants when collapsed) in `src/features/tree/useExpandCollapse.ts` (depends on T021)
- [X] T026 [US1] Implement `TreeCanvas`, wiring React Flow with `useTreeLayout`, `useExpandCollapse`, and the node/edge components in `src/features/tree/TreeCanvas.tsx` (depends on T022, T023, T024, T025)
- [X] T027 [US1] Implement the individual detail panel (full name, alias, dates, gender, notes, avatar) in `src/features/individuals/IndividualDetailPanel.tsx` (depends on T015)
- [X] T028 [US1] Implement the Home page, wiring the default-tree fetch, `TreeCanvas`, and detail panel together in `src/pages/Home.tsx` (depends on T020, T026, T027, T019)
- [X] T029 [P] [US1] Implement `exportCurrentViewAsPng` / `exportCurrentViewAsPdf` in `src/features/export/exportService.ts`
- [X] T030 [US1] Implement the "Export/Print" UI action, wired to `exportService` and reflecting current expand/collapse state (FR-027) in `src/features/export/ExportButton.tsx` (depends on T029, T026)
- [X] T031 [US1] Apply the bright/high-contrast theme and legible typography (FR-022) to `src/features/tree/TreeCanvas.tsx`, `src/features/tree/IndividualNode.tsx`, and `src/features/individuals/IndividualDetailPanel.tsx` (depends on T002, T026, T027)
- [X] T032 [US1] Ensure all US1-visible UI text is in Vietnamese (FR-026) in `src/pages/Home.tsx`, `src/features/tree/TreeCanvas.tsx`, `src/features/individuals/IndividualDetailPanel.tsx`, `src/features/export/ExportButton.tsx`

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Manage individuals and their relationships (Priority: P2)

**Goal**: Admin/Editor can create, edit, and delete individuals and their relationships; Viewer sees no such controls.

**Independent Test**: Sign in as `editor`; add a new individual, link it with a relationship, confirm it appears on the tree; edit and then delete it; confirm none of these controls appear for `viewer`.

### Implementation for User Story 2

- [X] T033 [US2] Implement `individualService` (`createIndividual`, `updateIndividual`, `deleteIndividual`, `uploadAvatar`) in `src/features/individuals/individualService.ts` (depends on T014, T015)
- [X] T034 [P] [US2] Implement `relationshipService` (`createRelationship`, `deleteRelationship`) in `src/features/relationships/relationshipService.ts` (depends on T014, T015)
- [X] T035 [US2] Implement the individual create/edit form (full name, alias, gender, partial birth/death dates, 100-character-limited notes, avatar upload) with `react-hook-form` + `zod` in `src/features/individuals/IndividualForm.tsx` (depends on T033)
- [X] T036 [US2] Implement the relationship create/edit UI (relationship type + two-individual picker) in `src/features/relationships/RelationshipForm.tsx` (depends on T034)
- [X] T037 [US2] Implement the delete-individual confirmation flow honoring FR-012 (block deletion, or require explicit confirmation to cascade-remove relationships) in `src/features/individuals/DeleteIndividualDialog.tsx` (depends on T033)
- [X] T038 [US2] Wire Admin/Editor-only add/edit/delete controls, hidden entirely for `viewer` — implemented via a modal-driven flow in `src/pages/Home.tsx` (create/edit/delete/relationship modals) using the `actions` slot already exposed by `src/features/individuals/IndividualDetailPanel.tsx`, keeping `TreeCanvas` free of auth logic (depends on T035, T036, T037, T018)
- [X] T039 [US2] Ensure US2 UI text and validation/confirmation messages are in Vietnamese (FR-026) in `src/features/individuals/IndividualForm.tsx`, `src/features/individuals/DeleteIndividualDialog.tsx`, `src/features/relationships/RelationshipForm.tsx`, `src/pages/Home.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Bulk import a family tree from a spreadsheet (Priority: P3)

**Goal**: Admin/Editor can upload a `.xlsx` file matching the predefined template to bulk-populate a tree, with row-level validation, duplicate flagging, and a result summary.

**Independent Test**: As `editor`, upload a sample file following `contracts/xlsx-import-template.md` containing one invalid row and one exact-duplicate row; confirm valid rows import, the invalid row is reported with a reason, and the duplicate is flagged rather than silently re-imported.

### Implementation for User Story 3

- [X] T040 [P] [US3] Implement `.xlsx` structural and row-level parsing/validation per `contracts/xlsx-import-template.md` in `src/features/import/xlsxParser.ts` (depends on T015)
- [X] T041 [US3] Implement `importFromXlsx` (duplicate detection via exact full-name + date-of-birth match, writes valid individuals/relationships, records `import_batches`/`import_row_results`) in `src/features/import/importService.ts` (depends on T040, T033, T034)
- [X] T042 [US3] Implement the import upload UI (file picker, target-tree selector) in `src/features/import/ImportDialog.tsx` (depends on T041)
- [X] T043 [US3] Implement the import result summary UI (succeeded/failed/duplicate counts, per-row reasons) in `src/features/import/ImportSummary.tsx` (depends on T041)
- [X] T044 [US3] Wire the Admin/Editor-only "Import" entry point into navigation, hidden for `viewer`, in `src/pages/Home.tsx` (depends on T042, T018)
- [X] T045 [US3] Ensure import UI and result messages are in Vietnamese (FR-026) in `src/features/import/ImportDialog.tsx` and `src/features/import/ImportSummary.tsx`

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: User Story 4 - Manage multiple family trees and choose the default (Priority: P4)

**Goal**: Admin can create up to 5 trees, delete trees, and designate which one is shown as default on the home page.

**Independent Test**: As `admin`, create a second tree, mark it default, confirm the home page now shows it; attempt a 6th tree and confirm it's blocked; attempt to delete the default/last tree and confirm it's blocked.

### Implementation for User Story 4

- [X] T046 [P] [US4] Implement `createFamilyTree`, `setDefaultFamilyTree`, `deleteFamilyTree` in `src/features/trees/treeService.ts` (depends on T020); added `supabase/migrations/0008_family_tree_functions.sql` for an atomic `set_default_family_tree` RPC so unset-old/set-new default never violates the single-default unique index
- [X] T047 [US4] Implement the Tree Management page (create/list/set-default/delete, surfacing `LIMIT_REACHED`/`CONFLICT` errors per FR-017/FR-021) in `src/pages/Admin/TreeManagement.tsx` (depends on T046)
- [X] T048 [US4] Wire the Admin-only "Manage Trees" navigation entry, hidden for `editor`/`viewer`, in `src/app/router.tsx` and `src/pages/Home.tsx` (depends on T047, T018)
- [X] T049 [US4] Ensure Tree Management UI and messages are in Vietnamese (FR-026) in `src/pages/Admin/TreeManagement.tsx`

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Test coverage, seed data, and final validation across all stories

- [X] T050 [P] Add unit tests for layout math, notes-length validation, and xlsx row validation in `tests/unit/useTreeLayout.test.ts`, `tests/unit/individualValidation.test.ts`, `tests/unit/xlsxParser.test.ts` — 16/16 passing (`npx vitest run`)
- [X] T051 [P] Add Playwright end-to-end specs covering `quickstart.md` scenarios 1–5 in `tests/e2e/family-tree.spec.ts` — 9 specs, verified with `npx playwright test --list`; actually *running* them requires a live Supabase backend seeded via `supabase/seed/seed.sql` and Playwright browsers installed (`npx playwright install`), neither available in this sandbox
- [X] T052 [P] Add `supabase/seed/seed.sql` with sample `admin`/`editor`/`viewer` profiles and one sample tree for local development
- [X] T053 Run all `quickstart.md` validation scenarios end-to-end and fix any gaps found (depends on T032, T039, T045, T049) — no live Supabase project in this sandbox, so this was a code-level cross-check of every scenario against the implementation instead of a live run; it caught and fixed one real gap (see note below)
- [X] T054 [P] Accessibility/readability pass (contrast ratios, font sizing) across `src/features/` and `src/styles/theme.css` per FR-022 — computed WCAG contrast ratios for every text/background pair; fixed two failing pairs (white-on-`brand-500` buttons → `brand-600`, `gold-500` text → new `gold-700`), all pairs now ≥4.5:1
- [X] T055 Verify `.env` is git-ignored and `.env.example` matches the required variables; write setup/run instructions in `README.md`

**Gap found and fixed during T053**: `TreeCanvas` was rendering every individual as a node even with zero relationships, contradicting spec.md US2 acceptance scenario 1 ("individual ... appears in the tree once at least one relationship links them to it"). Fixed by filtering to only relationship-connected individuals before layout/rendering (`src/features/tree/TreeCanvas.tsx`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — no dependency on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational; reuses `TreeCanvas`/detail panel from US1 (T038 edits files US1 created) but is independently testable once US1 exists
- **User Story 3 (Phase 5)**: Depends on Foundational; reuses `individualService`/`relationshipService` from US2 (T041) but is independently testable once US2 exists
- **User Story 4 (Phase 6)**: Depends on Foundational; extends `treeService.ts` from US1 (T046 edits the file T020 created) but is independently testable once US1 exists
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Parallel Opportunities

- All Setup tasks marked `[P]` (T002–T006) can run in parallel once T001 is done
- T014 and T015 (Foundational) can run in parallel
- Within US1: T020, T021, T023, T024, T025, T029 can run in parallel (distinct files); T022/T026/T028/T030/T031/T032 are sequential as noted
- Within US2: T034 can run in parallel with T033
- Within US3: T040 has no dependency on T033/T034 and can start in parallel with them
- Within US4: T046 can start as soon as T020 exists, in parallel with later US2/US3 work
- All Polish tasks marked `[P]` (T050, T051, T052, T054) can run in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch independent US1 tasks together:
Task: "Implement read-only tree listing in src/features/trees/treeService.ts"
Task: "Implement getTreeGraph(treeId) in src/features/tree/treeGraphService.ts"
Task: "Implement custom React Flow node component in src/features/tree/IndividualNode.tsx"
Task: "Implement custom React Flow edge components in src/features/tree/RelationshipEdge.tsx"
Task: "Implement exportCurrentViewAsPng/exportCurrentViewAsPdf in src/features/export/exportService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run `quickstart.md` scenario 1 independently
5. Deploy/demo if ready — this alone delivers a viewable, navigable, exportable family tree

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate → demo (MVP)
3. User Story 2 → validate → demo (families can now maintain their own data)
4. User Story 3 → validate → demo (bulk-load existing records)
5. User Story 4 → validate → demo (multi-tree/default management)
6. Polish → final hardening and full `quickstart.md` pass

### Parallel Team Strategy

With multiple developers, once Foundational (Phase 2) is done:

- Developer A: User Story 1 (tree rendering/export)
- Developer B: User Story 2 (individual/relationship CRUD) — can start in parallel, integrating with US1's `TreeCanvas` once available
- Developer C: User Story 3 (import) and User Story 4 (multi-tree) — both depend lightly on US1/US2 services but are independently testable

---

## Notes

- `[P]` tasks touch different files with no unmet dependencies
- `[Story]` label maps each task to its user story for traceability
- Role enforcement (Admin/Editor/Viewer) is authoritative in Postgres RLS (T013); UI-level hiding in T038/T044/T048 is a UX convenience, not the security boundary
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing

---

## Phase 8: Change Request — Guest/Public Viewing (post-implementation, 2026-07-19)

**Why**: Project owner requested that Admin be able to publish any tree to the home page so unauthenticated guests can view it — in practice only a few family members need accounts to manage the tree; everyone else only needs to view. Spec updated with FR-028, FR-029, revised FR-019/FR-020/FR-024/FR-027, new SC-009, and a new "Guest" entity (see spec.md, data-model.md, contracts/data-access-api.md, research.md §3a).

- [X] T056 [P] Add `family_trees.is_public` column and `anon`-role `select`-only RLS policies on `family_trees`/`individuals`/`relationships`, scoped to public trees, in `supabase/migrations/0009_public_tree_access.sql` (FR-028, FR-029)
- [X] T057 [P] Add the `avatars` Storage bucket (public-read) and Admin/Editor-only `insert`/`update`/`delete` policies on `storage.objects` in `supabase/migrations/0010_avatar_storage.sql` — this also fixes a pre-existing gap: the bucket and its policies had never actually been created in Phase 2 (T014's client code assumed a bucket that didn't yet exist in any migration)
- [X] T058 Add `setTreePublic(treeId, isPublic)` to `src/features/trees/treeService.ts`; extend `FamilyTreeSummary`/`FamilyTreeRow`/`mapFamilyTreeRow` with `isPublic` in `src/types/index.ts` and `src/lib/mappers.ts`
- [X] T059 Switch avatar URL resolution from signed URLs to `getPublicUrl` in `src/features/tree/treeGraphService.ts` — required because guest sessions have no auth token to request a signed URL, and the bucket is now public anyway
- [X] T060 Remove the `RequireRole` wrapper from `/` in `src/app/router.tsx`; update `src/pages/Home.tsx` to render a guest-appropriate header (sign-in link instead of sign-out) and a "this tree isn't published — sign in to view" empty state, while keeping all Admin/Editor management UI gated on `role` as before (guests get `role = null`, so `canManage` is already `false`)
- [X] T061 Add a "Công khai/Riêng tư" (public/private) toggle per tree to `src/pages/Admin/TreeManagement.tsx`
- [X] T062 Rename `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY` across `.env.example`, `src/lib/supabase.ts`, `src/vite-env.d.ts`, `README.md`, and this feature's spec docs (current Supabase terminology)
- [X] T063 Update `spec.md`, `data-model.md`, `contracts/data-access-api.md`, `research.md`, and `quickstart.md` (new scenario 6) to document guest/public viewing

**Verification**: `tsc -b`, `eslint .`, `vitest run` (16/16), and `vite build` all re-run clean after this change (no live Supabase project available in this sandbox to exercise the new RLS policies end-to-end — see quickstart.md scenario 6 for the manual check once deployed).
