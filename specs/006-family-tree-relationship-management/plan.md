# Implementation Plan: Family Tree Naming, Multi-Tree Membership & Relationship Management

**Branch**: `006-family-tree-relationship-management` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-family-tree-relationship-management/spec.md`

## Summary

Three layered changes on top of the existing Supabase/React family-tree app: (1) let an admin rename an existing family tree — the DB already allows this (`family_trees_admin_update` RLS policy), only the service function and UI are missing; (2) let an individual belong to more than one family tree by introducing a new `individual_tree_memberships` join table that becomes the sole authority for "who's in this tree," while the existing `individuals.family_tree_id` column is kept, unchanged in shape, as the person's immutable "originating tree" (it already seeds the first membership row and is never read for permission/visibility logic today — confirmed by grep); (3) let admin/editor add, change the type of, and delete a specific person's relationships from the tree UI — `createRelationship`/`deleteRelationship` already exist but `deleteRelationship` is never called from any component and there is no `updateRelationship` at all, so this is mostly new UI plus one new RLS `UPDATE` policy on `relationships` (only `select`/`insert`/`delete` exist today). The "only same-tree people are selectable" requirement (FR-012/013) already holds today by construction, because every caller feeds the relationship form `graph.individuals` from `getTreeGraph(treeId)` — it will keep holding once `getTreeGraph` is switched from filtering `individuals.family_tree_id` to filtering through the new membership table.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: `@supabase/supabase-js` (existing), `@tanstack/react-query` (existing), `react-hook-form` + `zod` (existing, forms) — no new packages

**Storage**: Supabase Postgres — two new migrations: `individual_tree_memberships` (new join table + triggers) and an `UPDATE` RLS policy on the existing `relationships` table. No changes to `individuals.family_tree_id`'s shape (still `not null`); its meaning narrows to "tree the person was originally created in."

**Testing**: Vitest + React Testing Library (`tests/unit/`), Playwright (`tests/e2e/`) — existing suites

**Target Platform**: Web browser (existing Vite/React SPA) + existing Supabase project (Postgres/RLS)

**Project Type**: Single-project web frontend + Supabase backend (existing structure; no custom API server)

**Performance Goals**: No new goal — this app has a hard cap of 5 family trees and correspondingly small per-tree individual/relationship counts (existing `MAX_TREES = 5` in `TreeManagement.tsx`); membership/relationship lookups stay well within what a single unpaginated Postgres query already handles today for `getTreeGraph`.

**Constraints**: Zero new npm dependencies. The membership-removal-blocks-last-tree rule (FR-007) and the same-family-tree relationship rule (FR-013) must be enforced in Postgres (trigger/RLS), not only client-side, consistent with this app's existing "RLS is the authoritative enforcement" convention (`0007_rls_policies.sql` header comment). Public/anonymous (`anon`) access must never see `individual_tree_memberships` rows (FR-017) — satisfied by simply not adding an `anon` `SELECT` policy for that table, mirroring how `0009_public_tree_access.sql` only grants `anon` access where explicitly needed.

**Scale/Scope**: Two new migrations, one new service module (`treeMembershipService.ts`), one new field/action set on three existing components (`TreeManagement.tsx`, `IndividualDetailPanel.tsx`, `TreeWorkspace.tsx`), one new small component (`TreeNameField.tsx`) mirroring the existing `SlugField.tsx` pattern, and additions to `treeService.ts` / `relationshipService.ts`. No data migration risk beyond a one-time backfill of the new join table from existing `individuals.family_tree_id` values.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (all `[PRINCIPLE_N_NAME]`/`[SECTION_N_CONTENT]` placeholders, no ratified project-specific principles) — same state observed for features 002–005. No gates apply; nothing to check.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/006-family-tree-relationship-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
├── 0017_individual_tree_memberships.sql        # NEW — contracts/tree-membership.md
└── 0018_relationships_admin_editor_update.sql  # NEW — contracts/relationship-management.md

src/features/trees/
├── treeService.ts               # MODIFY — add updateFamilyTreeName()
└── TreeNameField.tsx             # NEW — mirrors SlugField.tsx (contracts/tree-name-edit.md)

src/features/tree/
├── treeGraphService.ts          # MODIFY — getTreeGraph() individuals query switches to membership-based filter (contracts/tree-membership.md)
└── TreeWorkspace.tsx             # MODIFY — wire new modals (edit-relationship, manage-tree-membership) into existing ModalState union

src/features/individuals/
├── treeMembershipService.ts     # NEW — getIndividualTreeMemberships(), addIndividualToTree(), removeIndividualFromTree() (contracts/tree-membership.md)
├── ManageTreeMembershipDialog.tsx  # NEW — add-to-another-tree / remove-from-tree UI
└── IndividualDetailPanel.tsx     # MODIFY — relationship rows gain edit/delete controls when canManage; new "family trees" section

src/features/relationships/
├── relationshipService.ts       # MODIFY — add updateRelationship()
└── RelationshipTypeEditor.tsx    # NEW — small inline editor for changing an existing relationship's type

src/pages/Admin/
└── TreeManagement.tsx            # MODIFY — add "✏️ Sửa tên" action + modal using TreeNameField

tests/unit/          # existing Vitest + RTL suites — extend for treeMembershipService, relationshipService, treeGraphService
tests/e2e/           # existing Playwright suite — extend for rename, add/remove tree membership, and relationship edit/delete flows
```

**Structure Decision**: Purely additive/modification work inside the existing single-project Vite/React SPA (`src/`) plus two additive Supabase migrations — no new top-level directories, no new backend service. Every change lives in the existing `src/features/<domain>/` (or `src/pages/Admin/`) module it augments, following the convention already established by features 002–005.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
