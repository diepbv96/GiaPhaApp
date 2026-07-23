# Research: Cascade-Hide In-Law-Only Relatives

## 1. Why today's filter leaves dangling relatives behind

**Finding**: `filterOutInLaws` (`src/features/tree/inLawFilter.ts`) computes `inLawIds` (a spouse with no recorded parent, married to someone who has one), then returns `graph.individuals` minus `inLawIds` and `graph.relationships` minus any relationship touching an `inLawIds` member. It never inspects what happens to the *other endpoint* of a removed relationship. An in-law's exclusive child (e.g. from a relationship outside the family) has `hasParent = true` in the original graph (their parent is the in-law), so they are never added to `inLawIds` themselves — they survive the individuals filter, but their one and only relationship (`parent_child`, to the now-removed in-law) is stripped by the relationships filter. The result: that child still renders as a node, but with zero edges — exactly the "orphaned card" bug the spec describes, and confirmed live by tracing `TreeCanvas.tsx:37-45`, where `isolatedIds` (spec 008's flag) is computed from the *pre-filter* `graph`, so this newly-orphaned child is not even flagged as isolated — it looks like an ordinary, connected node that simply has no lines drawn to it.

**Decision**: Fix this at the source, inside `filterOutInLaws`, rather than downstream in `TreeCanvas.tsx` or `isolatedIndividuals.ts` — the bug is that the filter's *output graph* is internally inconsistent (an individual with relationships listed in the input graph that don't survive into the output), and the function that produces that inconsistency is the right place to close the gap.

## 2. Algorithm: a `bloodKept` predicate over the parent-child ancestry DAG

**Decision**: Replace the current two-set computation (`hasParent`, `inLawIds`) with a three-step pass, still inside `filterOutInLaws`, still returning `TreeGraph → TreeGraph`:

1. Compute `inLawIds` exactly as today (unchanged rule — this feature does not redefine "in-law").
2. Compute `bloodKept(x)` for every individual `x` not in `inLawIds`, via a recursive rule over `parent_child` relationships only:
   - If `x` has **no** recorded `parent_child` relationship as the child: `bloodKept(x) = true` (this is exactly today's founder rule, unchanged — anyone with no recorded parent is kept, regardless of what they're otherwise linked to).
   - If `x` has **at least one** recorded parent: `bloodKept(x) = true` iff at least one of those recorded parents `p` satisfies `p ∉ inLawIds AND bloodKept(p)`.

   This recursion is well-founded (never circular): `parent_child` relationships form a DAG by construction (a person is always recorded before their own children, and the app has no UI path to record someone as their own ancestor), so every chain terminates at an individual with zero recorded parents, and `bloodKept` can be computed bottom-up (memoized recursion or a single pass in birth order) with no risk of an unresolved cycle.
3. `keepIds` = every individual not in `inLawIds` with `bloodKept = true`. Filter `graph.individuals` and `graph.relationships` down to `keepIds` exactly as the current implementation already filters down to "not in `inLawIds`" — same shape of filter, new predicate.

**Rationale**: This directly implements FR-001/002/003 by following the same kind of relationship the user's own example uses ("con riêng của dâu/rễ" — a *child*, i.e. a `parent_child` record):
- An in-law's exclusive child has exactly one recorded parent (the in-law), which fails the `p ∉ inLawIds` test → `bloodKept = false` → hidden (US1 AS1).
- That child's own children have exactly one qualifying ancestor (their hidden parent), whose own `bloodKept` is already `false` → also `false`, transitively, with no extra iteration logic needed beyond the same recursive rule applied one generation further (US1 AS2, FR-003).
- A child *shared* between an in-law and their blood-relative spouse has **two** recorded parents; the blood-relative parent satisfies `p ∉ inLawIds AND bloodKept(p) = true`, so the shared child is `bloodKept = true` regardless of the in-law parent (US1 AS3, FR-002) — no special-casing required, it falls out of "at least one qualifying parent."
- A founder couple, or any individual with zero relationships recorded at all, has zero recorded parents by definition → `bloodKept = true` unconditionally — matching the existing test ("keeps a founding couple") and never disturbed by this feature.

**Alternatives considered**:
- *Breadth-first reachability from "no-parent" anchors, traversing every relationship type (`parent_child`, `spouse`, `sibling`)*: initially attractive because it looked like it would also resolve the edge case of two exclusive children linked only by a `sibling` relationship with neither having a `parent_child` record. Rejected on closer inspection (data-model.md's worked examples) — this repo's relationship model (`familyRelations.ts`) supports recording a standalone `sibling` relationship with **no** shared `parent_child` record on either side, and in that shape, a person with zero recorded parents laterally attached only to an already-excluded individual is indistinguishable, under a same-pass BFS, from a genuine founder (both have "zero recorded parents, not an in-law"). Resolving that ambiguity correctly requires either a second, component-boundary analysis pass (materially more complex, for a data shape the spec's own example never describes) or accepting an inconsistent result. The ancestry-only `bloodKept` rule sidesteps the ambiguity entirely by never using lateral (`spouse`/`sibling`) edges to decide blood status — it only ever asks "who is your recorded parent," which is unambiguous.
- *Component-boundary resolution for lateral-only individuals* (partition zero-parent individuals into components via `spouse`/`sibling` edges, then decide each component by whether it touches a `bloodKept = true` or `bloodKept = false` fixed individual): would fully resolve the sibling-only edge case, but adds a second algorithm stage, a new tie-breaking rule for components touching both kinds of neighbors, and handles a data shape not described by the feature's own motivating example. Deferred — not implemented by this feature (see spec.md Assumptions and Edge Cases); the existing "isolated individual" display (spec 008) already gives any resulting zero-relationship survivor a clear, non-broken-looking visual state, which keeps the residual gap cosmetic-only rather than a correctness bug.
- *Enumerate "in-law-only" descendants top-down from each in-law* (walk forward from `inLawIds` marking descendants as hidden): rejected — harder to get right for the "shared child stays visible" rule (FR-002), since a forward walk from the in-law would reach the shared child too and need an explicit exception; the parent-indexed `bloodKept` recursion gets this right automatically because it asks the shared child's *other* parent, which a forward-only walk from the in-law side never checks.

## 2a. Closing the residual gap: compute `isolatedIds` from the post-filter graph

**Finding**: `TreeCanvas.tsx` currently computes `isolatedIds` from the raw `graph` prop, before `filterOutInLaws` runs (`const isolatedIds = useMemo(() => computeIsolatedIds(graph), [graph])`, `TreeCanvas.tsx:37`). The rare residual case left unresolved by §2 above (a relative with no recorded parent, laterally linked only to a now-hidden individual via a `sibling`/`spouse` relationship) would, if their one relationship happens to be their only one, end up in `displayGraph.individuals` (kept, since `bloodKept = true`) but with zero relationships in `displayGraph.relationships` (their one link was to a hidden individual) — rendering as an ordinary-looking node with no edges, i.e. the same "looks broken" symptom this whole feature exists to fix, just for a narrower case.

**Decision**: Compute `isolatedIds` from `displayGraph` (the already-filtered graph) instead of the raw `graph`, and reorder the two `useMemo` calls in `TreeCanvas.tsx` so `displayGraph` is computed first. Concretely: `const displayGraph = useMemo(() => (hideInLaws ? filterOutInLaws(graph) : graph), [graph, hideInLaws])` stays first, then `const isolatedIds = useMemo(() => computeIsolatedIds(displayGraph), [displayGraph])`.

**Rationale**: When `hideInLaws` is `false`, `displayGraph === graph`, so `isolatedIds` is computed from the exact same input as today — zero behavior change in the toggled-off state (FR-005). When `hideInLaws` is `true`, this makes spec 008's existing "isolated individual" visual treatment (dashed border/badge) automatically apply to the rare residual case from §2 above, turning it from a silent-looking bug into an intentional, already-designed display state, with no new visual component and no change to `IndividualNode.tsx`. This one-line reordering is what makes spec.md's SC-001 ("zero disconnected/dangling cards remain") true even for the narrow case §2 doesn't hide outright.

**Alternatives considered**:
- *Leave `isolatedIds` computed from the raw graph*: rejected — spec.md's SC-001 explicitly requires no dangling-looking cards as a result of the toggle, and this is the only remaining path by which one could appear after §2's fix.

## 3. Complexity / performance

**Finding**: The existing function is already O(V + E) (two linear passes building `hasParent` and `inLawIds`, then two filters). The replacement is also O(V + E): one pass to build `hasParent`/`inLawIds`/`anchorIds` (same as today, plus the negation check for anchors), one pass to build the adjacency list, and one BFS that visits each node and edge at most once. No asymptotic regression, and family-tree graphs in this app are small (a handful to a few hundred individuals per tree), so this is not performance-sensitive.

**Decision**: No special-casing or memoization needed beyond what `TreeCanvas.tsx` already does (the `useMemo` wrapping `filterOutInLaws(graph)`, unchanged).

## 4. Call-site and test impact

**Finding**: `TreeCanvas.tsx` calls `filterOutInLaws(graph)` exactly once, behind `hideInLaws ? filterOutInLaws(graph) : graph` (line 39-41 today). The function's exported signature (`(graph: TreeGraph) => TreeGraph`) and its single call site are unaffected — only the function body changes.

**Decision**: No changes to `TreeCanvas.tsx`, `useTreeLayout.ts`, `useExpandCollapse.ts`, `isolatedIndividuals.ts`, or `IndividualNode.tsx`. `tests/unit/inLawFilter.test.ts` gets new `it(...)` cases for the cascade behavior; its three existing cases continue to pass unmodified under the new algorithm (verified by hand-tracing each in §2 above — see data-model.md for the worked examples).

## 5. No backend/RLS impact

**Decision**: This feature touches no Supabase table, RLS policy, or Edge Function, and reads no new field — it re-derives everything from `Relationship.type`/`personAId`/`personBId`, already fetched by the existing `getTreeGraph()` query. Confirmed by inspecting `src/types/index.ts` and the existing call chain; no new query or schema change is required.
