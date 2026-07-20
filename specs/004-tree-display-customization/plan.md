# Implementation Plan: Tree Display Customization — Card Status Styling & Background Color

**Branch**: `004-tree-display-customization` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-tree-display-customization/spec.md`

## Summary

Two independent, purely client-side changes to the existing tree canvas: (1) restyle each person card so its border+background communicate living-vs-deceased status, and relocate the existing gender-color indicator from the card's border to the avatar's border; (2) let any visitor pick a background color for the current tree or as a default for all trees, previewed live and persisted only in `sessionStorage` (never the server), with independent reset actions. No new dependencies, no backend/RLS changes — see `research.md`.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: `@xyflow/react` (existing, tree canvas), Tailwind CSS 4 (existing, styling), native `<input type="color">` (no new package — see research.md §1)

**Storage**: Browser `sessionStorage` only (client-local, per-origin, ephemeral) for the background color preference; no Supabase/database involvement — the card styling change reads existing `Individual.isDeceased`/`Individual.gender` fields with no schema change

**Testing**: Vitest + React Testing Library (`tests/unit/`), Playwright (`tests/e2e/`) — existing suites

**Target Platform**: Web browser (existing Vite/React SPA)

**Project Type**: Single-project web frontend (existing structure, no backend directory in this repo beyond one unrelated Supabase Edge Function)

**Performance Goals**: No new goal beyond SC-003 (pick→save→visible in under 30s, no reload) — reuses the existing render path; a `useState`-driven inline style update is effectively instant

**Constraints**: Zero new npm dependencies; zero changes to Supabase tables/RLS/Edge Functions (FR-008, FR-012); export (`exportService.ts`) must keep working unmodified (research.md §4)

**Scale/Scope**: 2 card visual states (living/deceased) × 3 existing gender categories on the avatar; 2 sessionStorage key families (per-tree, all-trees-default) with no practical bound on tree count within one browser session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (all `[PRINCIPLE_N_NAME]`/`[SECTION_N_CONTENT]` placeholders, no ratified project-specific principles) — same state observed for features 002 and 003. No gates apply; nothing to check.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── features/
│   └── tree/
│       ├── IndividualNode.tsx              # MODIFY — FR-001/FR-002 (contracts/person-card-styling.md)
│       ├── TreeCanvas.tsx                  # MODIFY — new `backgroundColor?` prop
│       ├── TreeWorkspace.tsx               # MODIFY — wires the color-preference hook + sidebar control
│       ├── backgroundColorPreference.ts    # NEW — pure sessionStorage get/set/resolve helpers
│       └── useBackgroundColorPreference.ts # NEW — React hook (contracts/background-color-preference.md)
└── styles/
    └── theme.css                           # MODIFY — new --color-card-living-*/--color-card-deceased-* tokens

tests/
├── unit/          # existing Vitest + RTL suites — extend for IndividualNode + the new hook
└── e2e/           # existing Playwright suite — extend for the sidebar color control flow
```

**Structure Decision**: This is a purely additive/modification change within the existing single-project Vite/React SPA (`src/`) — no new top-level directories, no backend directory (the app has no custom backend beyond one unrelated Supabase Edge Function from feature 002). All new logic lives alongside the tree feature it augments, following the existing `src/features/<domain>/` convention.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
