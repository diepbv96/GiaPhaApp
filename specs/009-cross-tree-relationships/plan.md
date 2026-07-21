# Implementation Plan: Cross-Tree Relationship Visibility

**Branch**: `009-cross-tree-relationships` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-cross-tree-relationships/spec.md`

## Summary

`getTreeGraph()`'s relationships query filters by `relationships.family_tree_id = treeId` — the single tree a relationship happened to be created in — instead of by current membership, the way individuals are already filtered (`individual_tree_memberships!inner(...)`, spec 006). So a relationship between two people silently disappears from any tree they're both added to later, even though they're fully valid members there. Fix: derive the member-individual ids already being fetched for the tree, then require both relationship endpoints to be in that set (`.in("person_a_id", memberIds).in("person_b_id", memberIds)`) instead of matching on the relationship's own `family_tree_id`. One RLS policy (`relationships_public_select`, guest/anon access to public trees) has the identical bug at the database layer and needs the equivalent membership-based rewrite so guests see the same thing authenticated users do. Everything else — relationship creation/edit/delete, the same-tree creation trigger, and the tree-membership-removal cascade — is already correct as-is (research.md §4) and needs no change.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: `@supabase/supabase-js` (existing query builder, no new packages)

**Storage**: Supabase Postgres — one migration, `0023_relationship_cross_tree_visibility.sql` (rewrites the `relationships_public_select` RLS policy only; no table/column/index change).

**Testing**: Playwright (`tests/e2e/`) — existing suite; no Vitest unit test warranted (research.md §1: this is a query-shape change, not new pure client-side logic).

**Target Platform**: Web browser (existing Vite/React SPA) + existing Supabase project (Postgres/RLS)

**Project Type**: Single-project web frontend + Supabase backend (existing structure)

**Performance Goals**: Unchanged from the app's existing small-scale assumption (5-tree cap, correspondingly small per-tree individual/relationship counts, research.md §2) — two sequential queries instead of one parallel pair is an accepted, imperceptible latency trade-off for correctness.

**Constraints**: Zero new npm dependencies, zero new tables/columns. Must not change relationship creation/edit/delete semantics, the `enforce_relationship_same_tree` creation trigger, or `removeIndividualFromTree`'s cascade scoping — research confirms all four are already correct for this feature's requirements (research.md §4) and touching them would be scope creep with no corresponding FR.

**Scale/Scope**: One query-shape change in one existing service function, one RLS policy rewrite in one new migration. No new files strictly required.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified project-specific principles) — same state observed for features 002–008. No gates apply; nothing to check.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/009-cross-tree-relationships/
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
└── 0023_relationship_cross_tree_visibility.sql   # NEW — data-model.md RLS section

src/features/tree/
└── treeGraphService.ts   # MODIFY — getTreeGraph() relationships query (contracts/tree-graph-relationship-visibility.md)

tests/e2e/
└── family-tree.spec.ts   # MODIFY — new test.describe("Spec 009 - ...") block (quickstart.md)
```

**Structure Decision**: Purely additive/corrective work inside the existing single-project Vite/React SPA (`src/`) plus one corrective Supabase migration — no new top-level directories, no new backend service, consistent with the convention established by features 002–008.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
