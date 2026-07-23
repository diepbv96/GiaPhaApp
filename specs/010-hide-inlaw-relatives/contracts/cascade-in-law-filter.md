# Contract: `filterOutInLaws` cascade behavior

**Module**: `src/features/tree/inLawFilter.ts` (behavior change to the existing exported function); `src/features/tree/TreeCanvas.tsx` (call-site reorder only, no prop/behavior change)

## Signature (unchanged)

```ts
export function filterOutInLaws(graph: TreeGraph): TreeGraph;
```

Pure function. Same input type, same output type, same call site (`hideInLaws ? filterOutInLaws(graph) : graph` in `TreeCanvas.tsx`). No new parameters, no new exports.

## Behavior

1. Compute `inLawIds` exactly as today: an individual with no recorded `parent_child` relationship as the child (`personBId`), who is also party to a `spouse` relationship whose other party *does* have a recorded parent.
2. For every individual `x` not in `inLawIds`, compute `bloodKept(x)` via memoized recursion over `parent_child` relationships (`personAId` = parent, `personBId` = child) in the **original, unmodified** `graph`:
   - No recorded parent (`x` never appears as `personBId` in a `parent_child` relationship): `bloodKept(x) = true`.
   - At least one recorded parent: `bloodKept(x) = true` iff at least one parent `p` (from every `parent_child` relationship where `x` is `personBId`) satisfies `p ∉ inLawIds AND bloodKept(p) = true`.
3. `keepIds = { x ∈ graph.individuals : x ∉ inLawIds AND bloodKept(x) }`.
4. Return `{ individuals: graph.individuals.filter(i => keepIds.has(i.id)), relationships: graph.relationships.filter(r => keepIds.has(r.personAId) && keepIds.has(r.personBId)) }`.

Step 2's recursion must be memoized (e.g. a `Map<string, boolean>` built once per call) so no individual's `bloodKept` is recomputed more than once per invocation — this keeps the whole function O(V + E), matching today's complexity (research.md §3).

## Companion change: `TreeCanvas.tsx` call-site reorder

`computeIsolatedIds` (from `src/features/tree/isolatedIndividuals.ts`, unchanged itself) must be computed from `displayGraph` (the result of the `hideInLaws ? filterOutInLaws(graph) : graph` memo), not from the raw `graph` prop. Concretely, the two `useMemo` calls in `TreeCanvas.tsx` swap order:

```ts
const displayGraph = useMemo<TreeGraph>(
  () => (hideInLaws ? filterOutInLaws(graph) : graph),
  [graph, hideInLaws],
);
const isolatedIds = useMemo(() => computeIsolatedIds(displayGraph), [displayGraph]);
```

When `hideInLaws` is `false`, `displayGraph === graph`, so this is a no-op versus today's behavior. `computeIsolatedIds` itself is not modified.

## Preconditions / non-goals

- Does not change the `inLawIds` computation or its rule (spec FR-004).
- Does not traverse `spouse` or `sibling` relationships to decide blood status — only `parent_child` (research.md §2; a documented, scoped limitation for the rare case of a `sibling`-only link with no recorded parent on either side, covered instead by the `isolatedIds` companion change).
- Does not mutate `graph`, persist anything, or perform any I/O — remains a pure, synchronous function.
- Does not change `useTreeLayout.ts`, `useExpandCollapse.ts`, `IndividualNode.tsx`, or `isolatedIndividuals.ts`'s own implementation.
- Does not change behavior when `hideInLaws` is `false` — `filterOutInLaws` is not called at all in that case, exactly as today.

## Test cases this contract must satisfy (`tests/unit/inLawFilter.test.ts`)

Traced in full in data-model.md's worked examples:

1. Founding couple (neither spouse has a parent) — both kept. *(existing test, must keep passing)*
2. Exclusive in-law with no exclusive children — in-law hidden, blood parent/child kept. *(existing test, must keep passing)*
3. Siblings sharing a parent, one sibling's spouse is an in-law — siblings and shared parent kept, only the in-law hidden. *(existing test, must keep passing)*
4. An in-law's exclusive child (no shared parent with the blood spouse) — child hidden along with the in-law. *(new)*
5. An in-law's exclusive grandchild (child of the exclusive child above) — also hidden, transitively, in the same call. *(new)*
6. A child shared between an in-law and their blood-relative spouse — stays visible. *(new)*
7. `hideInLaws` off — `TreeCanvas.tsx` never calls `filterOutInLaws`; graph renders unchanged. *(existing behavior, no new unit test needed — already implied by the `hideInLaws ? ... : graph` ternary, covered by existing component-level tests if any exist)*
