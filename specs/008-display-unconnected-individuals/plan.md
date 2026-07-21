# Implementation Plan: Display Individuals Without Relationships in Their Family Trees

**Branch**: `008-display-unconnected-individuals` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-display-unconnected-individuals/spec.md`

## Summary

A purely client-side rendering fix: `TreeCanvas.tsx` currently computes a `connectedGraph` that filters out any individual with zero relationships in the current tree (a single `useMemo`, `TreeCanvas.tsx:35-45`, explicitly documented in its own comment as intentional behavior from spec 006 US2 acceptance scenario 1) before handing the result to layout, rendering, and click-wiring. Research confirms every downstream piece — `treeGraphService.getTreeGraph()` (data fetch), `useTreeLayout` (union-find + d3-hierarchy layout), `useExpandCollapse`, `IndividualDetailPanel`/`familyRelations.ts` (relationship display), and the existing add-relationship/delete actions — already tolerates zero-relationship individuals gracefully today (empty arrays, `?? 0`/`?? []` fallbacks, a passing existing unit test that lays out a single unconnected individual correctly). The *only* place that excludes them is that one `TreeCanvas.tsx` memo. The fix: stop filtering individuals out of the graph handed to layout/rendering; instead compute an `isolatedIds` set from the same relationship-adjacency logic and use it only to add a new visual "no relationships in this tree" state to `IndividualNode.tsx`, so isolated individuals are shown, are visually distinguishable, and remain fully clickable through the existing selection/action wiring. No database changes.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: `@xyflow/react` (existing canvas/node rendering), `d3-hierarchy` (existing layout algorithm, via `useTreeLayout`) — no new packages, no version changes

**Storage**: N/A — no schema, RLS, or query change. `getTreeGraph()` already returns every tree member regardless of relationship count (confirmed: `individual_tree_memberships!inner(family_tree_id)` join has no dependency on `relationships`).

**Testing**: Vitest + React Testing Library (`tests/unit/`), Playwright (`tests/e2e/`) — existing suites

**Target Platform**: Web browser (existing Vite/React SPA)

**Project Type**: Single-project web frontend (existing structure) — this feature touches only `src/features/tree/`

**Performance Goals**: No new goal; unchanged from the app's existing small-scale assumption (5-tree cap, correspondingly small per-tree individual counts) — this feature does not introduce any new query or increase data volume, only what's rendered from data already being fetched.

**Constraints**: Zero new npm dependencies. Must not alter `useTreeLayout.ts` or `useExpandCollapse.ts` — research confirms both already handle zero-relationship individuals correctly by construction (union-find self-roots; empty adjacency-map lookups), so touching them would be scope creep with no corresponding requirement. The fix must be confined to `TreeCanvas.tsx`'s filtering memo and `IndividualNode.tsx`'s visual states.

**Scale/Scope**: One behavioral change in one existing memo (removes a filter), one new visual state added to one existing component, one stale code comment corrected. No new files strictly required, though a small derived-state helper may be extracted for clarity/testability.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified project-specific principles) — same state observed for features 002–007. No gates apply; nothing to check.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/008-display-unconnected-individuals/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/features/tree/
├── TreeCanvas.tsx        # MODIFY — connectivity memo stops filtering individuals out; instead derives an isolatedIds set used only for node styling (contracts/isolated-individual-display.md)
└── IndividualNode.tsx    # MODIFY — new visual state for "isolated" individuals (contracts/isolated-individual-display.md); no prop-shape change beyond one new boolean field

tests/unit/
└── TreeCanvas.test.tsx or useTreeLayout.test.ts (extended)   # NEW/MODIFY — assert isolated individuals are present in rendered nodes and flagged correctly; no pre-existing test asserts the old exclusion, so nothing needs to be "flipped," only added

tests/e2e/
└── family-tree.spec.ts (extended)   # MODIFY — add a scenario under a new/existing test.describe block covering an individual added to a second tree with no relationship there, confirming visibility + the add-relationship/delete actions work from the canvas
```

**Structure Decision**: Minimal, purely additive/corrective change inside the existing `src/features/tree/` module — no new top-level directories, no new services, no database migration, consistent with this being a display-logic fix rather than a new capability.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
