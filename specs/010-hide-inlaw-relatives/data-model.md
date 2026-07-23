# Data Model: Cascade-Hide In-Law-Only Relatives

No new persisted entity, field, or relationship type is introduced. This feature is a pure re-derivation over the existing `TreeGraph` (`src/types/index.ts`): `Individual[]` + `Relationship[]`, where `Relationship.type` is one of `"parent_child" | "spouse" | "sibling"`. This document describes the derived, in-memory-only concept the updated `filterOutInLaws` computes, and worked examples proving the algorithm from research.md §2 against every acceptance scenario in spec.md.

## Derived concepts

- **In-Law** *(existing concept, unchanged)*: an individual with no recorded `parent_child` relationship as the child, who is also the `personA`/`personB` of a `spouse` relationship whose other party *does* have a recorded parent. Computed exactly as today; this feature does not change this rule (spec FR-004).
- **`bloodKept(x)`** *(new derived predicate, computed per render, not stored)*: `true` if `x` has no recorded `parent_child` relationship as the child (the existing founder rule, unchanged in scope), otherwise `true` iff at least one of `x`'s recorded parents `p` satisfies `p ∉ inLawIds AND bloodKept(p)`. Evaluated over the *original* graph's `parent_child` relationships (a DAG — see research.md §2), independent of `spouse`/`sibling` relationships. `keepIds` = every individual not in `inLawIds` with `bloodKept = true`; `filterOutInLaws` filters `individuals` and `relationships` down to `keepIds` exactly as it already filters down to "not in `inLawIds`" today.

## State transitions

There is no persisted state to transition — `filterOutInLaws` remains a pure function called on every render when the "Ẩn dâu/rễ" toggle is on (`hideInLaws === true` in `TreeCanvas.tsx`), and is not called at all when the toggle is off (spec FR-005). Nothing about an individual or relationship record is ever modified; hiding is exclusively a matter of which subset of the already-fetched graph is handed to layout/rendering for that render (spec FR-006).

## Worked examples (trace of research.md §2's algorithm)

Each example lists the graph, then `inLawIds` → `bloodKept(x)` per individual → `keepIds`, matching one spec.md acceptance scenario or an existing regression test.

### Example A — existing test: founding couple kept (regression)

- Individuals: `grandfather`, `grandmother`. Relationship: `spouse(grandfather, grandmother)`.
- `inLawIds` = `{}` (neither spouse has a parent, so the in-law rule never fires).
- `bloodKept(grandfather)` = `true` (no recorded parent). `bloodKept(grandmother)` = `true` (no recorded parent).
- **Result**: `keepIds = {grandfather, grandmother}` — both kept, matching `tests/unit/inLawFilter.test.ts`'s existing "keeps a founding couple" case.

### Example B — existing test: exclusive in-law removed (regression)

- Individuals: `father`, `son`, `daughter-in-law`. Relationships: `parent_child(father, son)`, `spouse(son, daughter-in-law)`.
- `inLawIds` = `{daughter-in-law}` (no parent, spouse of `son` who has one).
- `bloodKept(father)` = `true` (no recorded parent). `bloodKept(son)` = `true` (parent `father` ∉ `inLawIds` and `bloodKept(father)` = `true`).
- **Result**: `keepIds = {father, son}` — matches the existing test exactly (`daughter-in-law` excluded, the relationship connecting her to `son` excluded).

### Example C — new: in-law's exclusive child hidden (spec US1 AS1)

- Individuals: `father`, `son`, `daughter-in-law`, `stepchild`. Relationships: `parent_child(father, son)`, `spouse(son, daughter-in-law)`, `parent_child(daughter-in-law, stepchild)`.
- `inLawIds` = `{daughter-in-law}`.
- `bloodKept(father)` = `true`. `bloodKept(son)` = `true` (via `father`). `bloodKept(stepchild)`: only recorded parent is `daughter-in-law` ∈ `inLawIds` → fails the `p ∉ inLawIds` test → `bloodKept(stepchild) = false`.
- **Result**: `keepIds = {father, son}` — `stepchild` is hidden, along with the relationship that used to connect them. Matches AS1.

### Example D — new: in-law's exclusive grandchild also hidden (spec US1 AS2)

- Same as Example C, plus: individual `stepgrandchild`, relationship `parent_child(stepchild, stepgrandchild)`.
- `bloodKept(stepgrandchild)`: only recorded parent is `stepchild`, and `stepchild ∉ inLawIds` but `bloodKept(stepchild) = false` (from Example C) → the `AND bloodKept(p)` half of the test fails → `bloodKept(stepgrandchild) = false`.
- **Result**: `keepIds = {father, son}` still — both `stepchild` and `stepgrandchild` hidden. The same one recursive rule reaches arbitrary depth without any extra iteration/fixpoint bookkeeping, because `bloodKept(stepchild)` is resolved once and reused. Matches AS2/FR-003.

### Example E — new: shared child stays visible (spec US1 AS3, FR-002)

- Individuals: `father`, `son`, `daughter-in-law`, `sharedchild`. Relationships: `parent_child(father, son)`, `spouse(son, daughter-in-law)`, `parent_child(son, sharedchild)`, `parent_child(daughter-in-law, sharedchild)`.
- `inLawIds` = `{daughter-in-law}`.
- `bloodKept(sharedchild)`: has two recorded parents, `son` and `daughter-in-law`. The `daughter-in-law` branch fails (`∈ inLawIds`), but the `son` branch succeeds (`son ∉ inLawIds AND bloodKept(son) = true`) → since the rule only requires *at least one* qualifying parent, `bloodKept(sharedchild) = true`.
- **Result**: `keepIds = {father, son, sharedchild}` — `sharedchild` stays visible even though one of their two recorded parents is a now-hidden in-law. Matches AS3/FR-002.

### Example F — sibling-only link with no recorded parent (spec Edge Cases — out of scope for the cascade, covered by the isolated-individual fallback instead)

- Individuals: `father`, `son`, `daughter-in-law`, `stepchild`, `stepchild-sibling`. Relationships as Example C, plus `sibling(stepchild, stepchild-sibling)` — `stepchild-sibling` has **no** `parent_child` relationship of their own recorded (the app's relationship model allows a standalone `sibling` link with no shared parent on record, per `familyRelations.ts`).
- `bloodKept(stepchild-sibling)`: has **no** recorded `parent_child` relationship as the child → by the founder rule, `bloodKept(stepchild-sibling) = true`, same as any other individual with no recorded parent. The cascade in research.md §2 deliberately never inspects `sibling`/`spouse` edges to decide blood status, so `stepchild-sibling`'s link to the now-hidden `stepchild` does not change this.
- **Result**: `keepIds` includes `stepchild-sibling` (kept) but excludes `stepchild` (hidden, per Example C) — so `stepchild-sibling` survives with zero remaining relationships in `displayGraph` (their only recorded link was the now-filtered `sibling(stepchild, stepchild-sibling)`). Per research.md §2a, `TreeCanvas.tsx` computes `isolatedIds` from this same post-filter `displayGraph`, so `stepchild-sibling` is flagged with the existing "isolated individual" indicator (spec 008) instead of rendering as an ordinary, inexplicably edge-less node. This is an intentionally scoped limitation, not a bug: see spec.md's Assumptions and Edge Cases for why extending the cascade to lateral (`sibling`/`spouse`) edges was considered and deferred.

## Assumptions

- `bloodKept` is evaluated fresh on every render from the current `graph`, exactly like today's `hasParent`/`inLawIds` computation — no caching across renders beyond the existing `useMemo` in `TreeCanvas.tsx`.
- `parent_child` relationships are assumed to form a DAG (no individual is their own ancestor) — consistent with every other part of this codebase (`useTreeLayout.ts`'s layout algorithm, `familyRelations.ts`'s parent/child derivation) already assuming tree-shaped ancestry with no cycle-detection of its own.
