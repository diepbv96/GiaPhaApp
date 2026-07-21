# Data Model: Display Individuals Without Relationships in Their Family Trees

No database entities, columns, indexes, or RLS policies change in this feature — it is a client-side rendering fix over data the app already fetches correctly (research.md §1, §6). The only "data model" affected is in-memory, derived UI state.

## Individual (existing entity, no schema change)

Source: `src/types/index.ts`. Unchanged. Continues to be fetched via `getTreeGraph(treeId)`, which already returns every member of the tree (via `individual_tree_memberships`) regardless of relationship count.

## Relationship (existing entity, no schema change)

Source: `src/types/index.ts`. Unchanged. Used, as before, only to compute connectivity — its absence for a given individual no longer removes them from the rendered graph, only from the "connected" classification.

## New derived UI state (not persisted, not a database entity)

Computed fresh per render in `TreeCanvas.tsx` from the existing `graph`/`relationships` data already in memory:

```ts
// Individuals present in graph.individuals but referenced by zero rows in graph.relationships,
// for this tree only (graph is already tree-scoped by getTreeGraph).
type IsolatedIds = Set<string>; // Set<individual.id>
```

Threaded into node data as one new field on the existing `IndividualNodeData` interface (`src/features/tree/IndividualNode.tsx`):

```ts
export interface IndividualNodeData {
  individual: Individual;
  hasChildren: boolean;
  collapsed: boolean;
  isIsolated: boolean;      // NEW — true when this individual has zero relationships in the current tree
  onToggleCollapse: (individualId: string) => void;
  onSelect: (individualId: string) => void;
  [key: string]: unknown;
}
```

No other type changes. `TreeGraph` (`src/types/index.ts`) is unchanged — it already carries every individual and relationship needed; `isolatedIds` is derived, not stored.

## Behavioral invariants (enforced by existing code, unchanged by this feature)

- Every individual in `graph.individuals` (i.e., every member of the tree per `individual_tree_memberships`) now produces exactly one rendered node — no individual is ever silently dropped from the canvas regardless of relationship count (FR-001/FR-002).
- `isIsolated` is computed independently per tree view (fresh `useMemo` keyed on that tree's `graph`) — an individual isolated in Tree 2 but fully connected in Tree 1 is flagged correctly and independently in each (FR-008).
- Removing an individual's last relationship in a tree causes `isolatedIds` to include them on the next render (the memo recomputes whenever `graph` changes, e.g. after the existing relationship-delete mutation's cache invalidation) — they remain rendered, now flagged isolated, never removed from view (FR-004).
