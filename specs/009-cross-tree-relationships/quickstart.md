# Quickstart: Cross-Tree Relationship Visibility

## Prerequisites

- Local dev environment running (`npm run dev`) against a Supabase project with migrations through `0023_relationship_cross_tree_visibility.sql` applied.
- An admin or editor account, and at least two family trees (the app allows up to 5, `0003_family_trees.sql`).

## Scenario 1 — relationship follows both members into a new tree (US1)

1. In family tree 1, create individuals A and B, and record a relationship between them (e.g. spouse).
2. Open the "manage family trees" dialog for A, add A to family tree 2. Repeat for B.
3. Switch to family tree 2.

**Expected**: A and B both appear in family tree 2, connected by the same relationship recorded in step 1 — no recreation needed. Switching back to family tree 1 still shows the relationship there too (`contracts/tree-graph-relationship-visibility.md`).

## Scenario 2 — relationship stays hidden until both parties share the tree (US2)

1. Continue from Scenario 1's step 1 (A and B related in tree 1 only).
2. Add only A to family tree 2 (not B).
3. Open family tree 2.

**Expected**: A appears alone in family tree 2 (isolated-individual display, spec 008), with no relationship line to B. Now also add B to family tree 2 — the relationship should appear immediately.

## Scenario 3 — removing a shared membership elsewhere doesn't lose the relationship (US3)

1. Continue from Scenario 1, with A and B now members of both tree 1 and tree 2.
2. Remove A's membership from tree 2 only (not tree 1), via the "manage family trees" dialog.

**Expected**: Removal succeeds without needing to confirm a relationship-cascade checkbox (the relationship was recorded in tree 1, not tree 2). Family tree 1 still shows the relationship between A and B unchanged. Family tree 2 no longer shows A at all.

## Guest parity check

1. Mark family tree 2 as public (admin-only toggle).
2. Sign out (or open an incognito window) and view family tree 2's public page.

**Expected**: an unauthenticated guest sees the same relationship between A and B in family tree 2 that an authenticated viewer sees — confirms the `relationships_public_select` RLS rewrite (`data-model.md`) is in effect, not just the client-side query change.

## Automated coverage

Playwright e2e (`tests/e2e/family-tree.spec.ts`, new `test.describe("Spec 009 - ...")` block) automates Scenarios 1–3 above against a real Supabase project — this feature has no pure-logic surface warranting a Vitest unit test (research.md §1: the fix is a query-shape change, not new client-side branching logic).
