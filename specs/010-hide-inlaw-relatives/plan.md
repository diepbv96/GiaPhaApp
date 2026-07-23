# Implementation Plan: Cascade-Hide In-Law-Only Relatives

**Branch**: `010-hide-inlaw-relatives` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-hide-inlaw-relatives/spec.md`

## Summary

Extend the existing `filterOutInLaws` pure function (client-side, `src/features/tree/inLawFilter.ts`) so that, when the "Ẩn dâu/rễ" toggle is on, it hides not only each in-law but also every relative whose recorded parent-child ancestry traces back exclusively to a now-hidden in-law (e.g. an in-law's exclusive children and their own descendants), while still showing any relative who has at least one recorded parent outside that hidden ancestry (e.g. a child shared between an in-law and their blood-relative spouse). The fix is a recursive `bloodKept(x)` predicate over `parent_child` relationships only (a DAG, so always well-founded): anyone with no recorded parent is kept (today's unchanged founder rule); anyone with a recorded parent is kept iff at least one of their parents is both kept and not an in-law. A small companion fix moves `TreeCanvas.tsx`'s existing `isolatedIds` computation (spec 008) to run on the post-filter graph instead of the raw graph, so the rare residual case this ancestry-only rule doesn't cover (a relative with no recorded parent, linked only via a `sibling`/`spouse` relationship to a now-hidden individual) gets the existing isolated-individual visual treatment instead of looking like a rendering bug. No new UI, storage, or API surface — this is a pure-function, display-only change.

## Technical Context

**Language/Version**: TypeScript 5 (React 19, Vite) — same stack as the rest of `src/features/tree/`

**Primary Dependencies**: None new — reuses existing `TreeGraph`/`Individual`/`Relationship` types (`src/types/index.ts`) and is called from the existing `TreeCanvas.tsx` exactly where `filterOutInLaws` is already called today

**Storage**: N/A — pure client-side derivation over an already-fetched `TreeGraph`; no Supabase table, query, or RLS policy is read or written

**Testing**: Vitest (`tests/unit/inLawFilter.test.ts` already exists and is extended with the new cascade cases; no new test file needed)

**Target Platform**: Web (existing React SPA), same as every other tree-display feature in this repo

**Project Type**: Single web app (frontend-only change)

**Performance Goals**: No regression versus today's `filterOutInLaws` — both are a single linear/near-linear pass over a tree's individuals and relationships, evaluated client-side on toggle change, on the same small-to-moderate family-tree graph sizes the app already renders

**Constraints**: Must remain a pure function with no side effects (no new state, no persistence); must not change behavior when the toggle is off; must not change what counts as an "in-law" under the existing rule

**Scale/Scope**: One function body rewrite (`inLawFilter.ts`) plus a two-line reorder in its call site (`TreeCanvas.tsx`, research.md §2a); no other module changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no principles have been ratified for this project), so there are no project-specific gates to check against. No violations to justify; this section is N/A for this feature, consistent with how prior features (001–009) in this repo have treated it.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/010-hide-inlaw-relatives/
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
├── inLawFilter.ts        # MODIFY — filterOutInLaws replaces its current "strip in-laws + touching relationships" logic with the bloodKept ancestry algorithm (contracts/cascade-in-law-filter.md); same exported signature (`TreeGraph → TreeGraph`), same call site in TreeCanvas.tsx
└── TreeCanvas.tsx        # MODIFY — reorder two existing useMemo calls so computeIsolatedIds(displayGraph) runs on the post-filter graph instead of computeIsolatedIds(graph) on the raw one (research.md §2a); no prop-shape or JSX change

tests/unit/
└── inLawFilter.test.ts   # MODIFY — extend with cascade cases: exclusive child hidden, exclusive grandchild hidden, shared child kept, toggle-off no-op (data-model.md, quickstart.md)
```

**Structure Decision**: Two small, purely internal changes inside the existing `src/features/tree/` module — no new files, no new top-level directories, no database migration, no change to `filterOutInLaws`'s call site or props.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
