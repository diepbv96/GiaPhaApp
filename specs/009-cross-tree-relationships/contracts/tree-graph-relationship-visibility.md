# Contract: `getTreeGraph()` relationship visibility

**Module**: `src/features/tree/treeGraphService.ts`

## Signature (unchanged)

```ts
export async function getTreeGraph(treeId: string): Promise<TreeGraph>
```

## Behavior (changed)

**Before**: individuals and relationships were fetched with two independent, parallel queries; relationships were filtered by `relationships.family_tree_id = treeId` — the tree the relationship row happened to be created in.

**After**:

1. Fetch the tree's member individuals exactly as before (`individual_tree_memberships!inner(family_tree_id)`, `.eq("individual_tree_memberships.family_tree_id", treeId)`) — unchanged query.
2. Derive `memberIds` = the `id` of every individual returned by step 1.
3. If `memberIds` is empty, skip the relationships query and return `[]` for relationships (an empty tree has no members and therefore no relationships to show).
4. Otherwise, fetch relationships with `.in("person_a_id", memberIds).in("person_b_id", memberIds)` — both endpoints must be current members of this tree. `relationships.family_tree_id` is no longer part of the filter.

Steps 1 and 4 are sequential (4 depends on 1's result), not parallel — a deliberate, documented latency/correctness trade-off (research.md §2).

## Non-goals

- Does not change `createRelationship()`, `updateRelationship()`, or `deleteRelationship()` — relationship creation, editing, and deletion are unaffected; only *display* changes (research.md §4).
- Does not change `removeIndividualFromTree()`'s `cascadeRelationships` behavior, which intentionally stays scoped to `relationships.family_tree_id = old.family_tree_id` (the tree membership actually being removed) — that is already the correct behavior for FR-006, not a bug this feature needs to fix (research.md §4).
- Does not add a "which trees is this relationship visible in" field to the `Relationship` type or any API response — visibility remains purely computed per-request from current membership data, never stored.

## Guest (anon) parity

For unauthenticated guests viewing a public tree, the same before/after query shape applies, but is only reachable at all if the underlying `relationships_public_select` RLS policy also permits it — see `data-model.md`'s Row Level Security section and migration `0023_relationship_cross_tree_visibility.sql`. Without that RLS change, a guest would receive fewer rows than an authenticated viewer of the identical tree even after the query-shape change above, because RLS filters rows before the client-side `.in()` filters ever see them.
