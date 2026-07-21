# Research: Display Individuals Without Relationships in Their Family Trees

## 1. Locating the exclusion (FR-001, FR-002, FR-003, FR-004, FR-008)

**Finding**: `TreeCanvas.tsx:35-45` computes `connectedGraph` via a `useMemo`: it builds a `connectedIds` set from every relationship's `personAId`/`personBId` (all relationship types — parent_child, spouse, sibling all count), then filters `graph.individuals` down to only those ids. The code's own comment (lines 32-34) documents this as intentional, citing spec 006 US2 acceptance scenario 1. Every downstream computation in the file — `displayGraph` (in-law filtering, chained on top), `useTreeLayout(displayGraph)`, `useExpandCollapse(displayGraph, unitIdOf)`, the `nodes`/`edges` memo, and the final `<ReactFlow>` render — uses `connectedGraph`/`displayGraph`, never the raw `graph` prop again after line 35. Grep confirms no other file in `src/features/tree/` or `src/features/individuals/` implements a similar connectivity filter; `filterOutInLaws` is an orthogonal (blood-vs-married-in) filter that operates on whatever graph it's handed and is unaffected by this change.

**Decision**: Replace the filtering behavior with a non-filtering one. The connectivity computation itself (building a set from relationship endpoints) is still needed — just repurposed from "which individuals to keep" to "which individuals to flag as isolated for styling":

```ts
const isolatedIds = useMemo(() => {
  const connectedIds = new Set<string>();
  for (const rel of graph.relationships) {
    connectedIds.add(rel.personAId);
    connectedIds.add(rel.personBId);
  }
  return new Set(graph.individuals.filter((i) => !connectedIds.has(i.id)).map((i) => i.id));
}, [graph]);
```

`displayGraph` becomes `hideInLaws ? filterOutInLaws(graph) : graph` — i.e., the in-law filter now chains directly off the raw, unfiltered `graph` instead of off `connectedGraph`, since the connectivity filter no longer removes anything from the graph itself. `isolatedIds` is passed down alongside `displayGraph` so the node-building memo (`nodes`/`edges`) can set a new field on each `IndividualNodeData` (§4) — `isIsolated: isolatedIds.has(individual.id)` — with zero change to how `nodes`/`edges` are otherwise constructed. The stale code comment (lines 32-34) is corrected to describe the new behavior and reference spec 008 instead of spec 006.

**Alternatives considered**:
- Keeping `connectedGraph` as a separate, still-filtered value used only for layout purposes while rendering all individuals via a different path: rejected — research (§2) already confirms `useTreeLayout` handles the *unfiltered* graph (including isolated individuals) correctly on its own, so there is no need for two different graphs; passing the same, single unfiltered `displayGraph` everywhere is simpler and was already proven correct by the existing `useTreeLayout` test (§2).

## 2. Layout algorithm already tolerates isolated individuals (no change needed)

**Finding**: `useTreeLayout.ts`'s union-find (lines 66-97) seeds every individual in `graph.individuals` as its own root (line 68: `for (const individual of graph.individuals) parentOf.set(individual.id, individual.id)`) and only calls `union()` for `spouse` relationships that exist — an individual with zero relationships is simply never unioned with anyone, so it becomes its own singleton unit and, having no recorded parent, lands in `unitRoots` (lines 134-142) exactly like any other top-level/root family unit. It is positioned by the same `d3-hierarchy` `tree()` layout as everyone else (lines 170-182), and the manual `layoutPosition` override loop (lines 237-245) applies to it identically. This is empirically confirmed by an already-passing test, `tests/unit/useTreeLayout.test.ts:204-212`, which feeds `useTreeLayout` a single individual with zero relationships and asserts a valid position is returned — proving the hook was never the blocker; `TreeCanvas.tsx`'s pre-filtering (§1) simply never let this code path run against real data.

**Decision**: No change to `useTreeLayout.ts`. Once `TreeCanvas.tsx` stops filtering isolated individuals out of the graph it passes in, this existing, already-correct behavior activates automatically.

**Alternatives considered**: Adding a special-cased layout branch for isolated individuals (e.g. grouping them together in a dedicated area of the canvas): rejected — no functional requirement asks for a distinct spatial arrangement beyond "displayed" and "visually distinguishable" (FR-001, FR-005); the existing root-unit placement already satisfies both once combined with the new node styling (§4), and inventing a second layout mode would be unrequested complexity.

## 3. Expand/collapse already tolerates isolated individuals (no change needed)

**Finding**: `useExpandCollapse.ts`'s `childrenOf`/`spousesOf` maps (lines 21-44) are built purely from `graph.relationships`; an individual with none simply never appears as a key, and every consumer (`hiddenIds`, `hasChildren`) already coalesces missing lookups to `[]`/`0` (lines 64-92). `hasChildren` correctly evaluates to `false` for an isolated individual, which — per `IndividualNode.tsx`'s existing logic (§4) — already means no collapse/expand button is rendered for them, with no crash and no new guard needed.

**Decision**: No change to `useExpandCollapse.ts`.

## 4. Visual distinction (FR-005) — extending `IndividualNode.tsx`

**Finding**: `IndividualNode.tsx` is the only node-rendering component (no `IndividualCard`/`TreeNode` elsewhere). Its existing visual states — gender border, living/deceased border+background, sibling-order badge, conditional collapse button — are each a small `Record<..., style>` lookup or a single conditional render, keyed purely off fields already present on `IndividualNodeData` (`individual`, `hasChildren`). There is currently no "isolated/no relationships" visual state, and no "selected" highlight either (selection is tracked externally in `TreeWorkspace.tsx` and never rendered on the node itself) — this feature introduces a genuinely new visual state, not a variant of an existing one.

**Decision**: Add `isIsolated: boolean` to `IndividualNodeData` (populated per §1). In `IndividualNode.tsx`, add one new conditional visual treatment following the exact pattern already used for the other states — e.g. a distinct dashed border style (as opposed to the existing solid gender-colored border) plus a small badge/label (e.g. "Chưa có mối quan hệ" — "no relationships yet") rendered only `if (isIsolated)`, positioned similarly to the existing sibling-order badge. Exact visual styling (colors, copy wording) is a UI-polish decision to finalize during implementation, not a plan-level decision — the requirement is only that it be visually distinguishable from a connected individual's card, satisfying FR-005/SC-003.

**Alternatives considered**:
- A separate node type (`nodeTypes.isolated`) registered alongside `"individual"`/`"junction"`: rejected — would duplicate all of `IndividualNode.tsx`'s existing rendering logic (gender border, deceased styling, sibling badge, click/collapse wiring) for no benefit over adding one conditional block to the existing component, and would risk the two node types drifting out of sync over time.

## 5. Selection and existing actions already work unconditionally (FR-006, FR-007) — no change needed

**Finding**: The click handler chain (`IndividualNode`'s `onClick` → `data.onSelect` → `TreeCanvas`'s `onSelectIndividual` prop → `TreeWorkspace.tsx`'s `setSelectedId`) is a plain `individualId: string` passthrough with no relationship-count assumption anywhere in the chain. `TreeWorkspace.tsx`'s `relationshipCount` derivation (`graph.relationships.filter(...).length`) already evaluates to `0` safely for an isolated individual, and `DeleteIndividualDialog`/`IndividualDetailPanel`/`familyRelations.ts` all already have explicit empty-array/zero-count handling (e.g. `PersonList`'s `if (people.length === 0) return <p>Chưa rõ</p>`). The "Thêm mối quan hệ" and "Xoá cá thể" actions in `TreeWorkspace.tsx` are gated only on `canManage && selectedIndividual`, never on relationship count. The only reason these are unreachable for an isolated individual **today** is that no node — and therefore no click target — is ever rendered for them (§1); once §1's fix lands, this entire chain works with zero further changes.

**Decision**: No change to `TreeWorkspace.tsx`, `IndividualDetailPanel.tsx`, `familyRelations.ts`, or `DeleteIndividualDialog.tsx`.

## 6. Per-tree independence is already guaranteed (FR-008, Edge Cases)

**Finding**: `getTreeGraph(treeId)` scopes both its individuals query (via `individual_tree_memberships`) and its relationships query (`.eq("family_tree_id", treeId)`) to the requested tree, and `TreeWorkspace.tsx` caches results per tree under query key `["tree-graph", treeId]`. An individual's connectivity in Tree 1 can never leak into the `TreeGraph` object fetched and rendered for Tree 2 — each is an independently-scoped fetch and an independently-scoped `TreeCanvas` computation (§1's `isolatedIds` is recomputed fresh per `graph`).

**Decision**: No change needed — this guarantee already holds by construction and requires no new code.

## 7. Viewer (read-only) access (FR-009 / User Story 2, Acceptance Scenario 4)

**Finding**: Nothing in the click/selection/rendering chain (§1, §5) is gated by role — `canManage` (role-based) only gates whether the *action buttons* (add relationship, delete) render inside `IndividualDetailPanel`, not whether a node is visible or selectable. This is unaffected by this feature's change: a viewer will see the same isolated-individual node (now visible, per §1) and the same visual distinction (§4), but will not see add-relationship/delete controls, exactly as for any other individual today.

**Decision**: No change needed.

## 8. No existing test encodes the old exclusion as a hard assertion

**Finding**: Grep across `tests/unit/` and `tests/e2e/` for `connectedIds`/`connectedGraph`/`TreeCanvas` finds no test file exercising `TreeCanvas.tsx`'s filtering memo directly (no `TreeCanvas.test.tsx` exists); the only hits are e2e specs using the `tree-canvas` `data-testid` for unrelated visibility/click assertions. The old behavior is documented only in the `TreeCanvas.tsx` code comment, not in any test.

**Decision**: This feature's tests are net-new additions (a rendering-level test asserting an isolated individual produces a node, and an e2e scenario per quickstart.md), not modifications of a previously-failing/now-passing test.
