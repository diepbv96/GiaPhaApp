# Contract: Isolated individual display on the tree canvas

**Modules**: `src/features/tree/TreeCanvas.tsx` (behavior change), `src/features/tree/IndividualNode.tsx` (new visual state)

## Behavior

1. `TreeCanvas.tsx` receives `graph: TreeGraph` (already tree-scoped, already including every member of the tree per `individual_tree_memberships` regardless of relationship count — no change to how `graph` is obtained).
2. `TreeCanvas.tsx` computes `isolatedIds: Set<string>` from `graph.relationships`' endpoints, same adjacency logic as before, but now used only for classification, never for filtering (data-model.md).
3. `displayGraph` = `graph` with the in-law filter (`filterOutInLaws`) applied on top when `hideInLaws` is on — no individual is removed for having zero relationships at any point in this pipeline.
4. `useTreeLayout(displayGraph)` and `useExpandCollapse(displayGraph, unitIdOf)` run unchanged, over the now-unfiltered graph — every individual, including isolated ones, receives a computed position and expand/collapse state (research.md §2, §3).
5. The `nodes` memo builds one `IndividualNode` per individual in `displayGraph.individuals` (previously `visibleIndividuals`, now simply every member), setting `data.isIsolated = isolatedIds.has(individual.id)`.
6. `IndividualNode.tsx` renders its existing states (gender border, living/deceased styling, sibling badge, conditional collapse button — all unchanged) **plus**, when `data.isIsolated` is true, a new visual treatment distinguishing it from a connected individual's card (e.g. a dashed border instead of solid, and/or a small "no relationships in this tree" badge). The collapse/expand button remains absent for isolated individuals, exactly as before (`hasChildren` is already `false` for them).
7. Click behavior on an isolated node's card is unchanged from any other node's — `onSelect(individual.id)` fires identically, opening the same `IndividualDetailPanel` with the same add-relationship/delete actions (gated only on role, never on relationship count).

## Visual requirement (FR-005 / SC-003)

The isolated-state visual treatment MUST be distinguishable from every existing state (gender border colors, deceased styling) without relying on color alone (e.g. a border style change and/or an explicit text badge), so admins/editors can identify a zero-relationship individual by looking at the canvas, without opening any other list or view. Exact colors/copy are an implementation detail, not fixed by this contract.

## Preconditions / non-goals

- Does not change how many individuals are fetched (`getTreeGraph`) — only which of the already-fetched individuals get filtered out of the render (now: none, for connectivity reasons).
- Does not add a "selected" highlight state — out of scope, unrelated to this feature.
- Does not change `useTreeLayout.ts` or `useExpandCollapse.ts` — both already produce correct output for isolated individuals once they receive them (research.md §2, §3).
- Does not change how many isolated individuals can be laid out simultaneously, or introduce a distinct layout arrangement for them — they are positioned as ordinary root units by the existing algorithm; the spec's Assumptions explicitly leave large-scale layout/spacing behavior as an implementation detail as long as the view stays usable.
