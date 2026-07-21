# Implementation Plan: Usability Enhancements — Delete, Sibling Order, Tree Navigation, Email Templates, Calendar Counts

**Branch**: `005-usability-enhancements` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-usability-enhancements/spec.md`

## Summary

Five independent fixes/refinements layered onto the existing app: (1) make the already-built "confirm cascade delete" dialog actually work for every individual, including a previously-undiscovered second foreign-key blocker from bulk-import bookkeeping records that the current cascade logic doesn't clear; (2) make the family tree layout actually respect each person's already-recorded birth-order position when placing siblings left-to-right, and relabel position 2 (the existing "no thứ nhất" convention's eldest slot) with a gender-aware "Con Trai/Gái/‑ Trưởng" label instead of the generic "Con thứ 2"; (3) add a "Xem chi tiết" link on each tree-list item to that tree's existing slug URL; (4) seed the (currently indistinguishable-from-unset) empty email template field with a client-side sample default; (5) swap the calendar day cell's presence emoji for the actual event count. No new dependencies; one small RLS-policy migration is required (see research.md §1). Full grounding for every decision below comes from reading the actual current source, not assumption.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: `@supabase/supabase-js` (existing), `@tanstack/react-query` (existing), `react-router-dom` (existing, already used for slug routing), `d3-hierarchy` (existing, tree layout) — no new packages

**Storage**: Supabase Postgres — one new migration adding an `UPDATE` RLS policy on the existing `import_row_results` table (see research.md §1); no new tables/columns anywhere else in this feature

**Testing**: Vitest + React Testing Library (`tests/unit/`), Playwright (`tests/e2e/`) — existing suites

**Target Platform**: Web browser (existing Vite/React SPA) + existing Supabase project (Postgres/RLS)

**Project Type**: Single-project web frontend + Supabase backend (existing structure; no custom API server)

**Performance Goals**: No new goal — all five changes are O(1)/O(siblings-per-unit) additions to code paths that already run once per render or once per delete action

**Constraints**: Zero new npm dependencies; the one schema change is additive (a permissive RLS policy), not a new column/table, so it doesn't require backfill; must not change any existing RLS `SELECT` visibility rules (spec Assumptions: no role/permission changes)

**Scale/Scope**: Touches 5 existing frontend modules (`individuals`, `tree`, `Admin/TreeManagement`, `notifications`, `events`) plus 1 new migration; no data migration/backfill needed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (all `[PRINCIPLE_N_NAME]`/`[SECTION_N_CONTENT]` placeholders, no ratified project-specific principles) — same state observed for features 002, 003, and 004. No gates apply; nothing to check.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/005-usability-enhancements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 0016_import_row_results_admin_editor_update.sql   # NEW — contracts/delete-individual.md

src/features/individuals/
├── individualService.ts        # MODIFY — deleteIndividual() also clears import_row_results.individual_id
├── formatters.ts                # MODIFY (src/lib/formatters.ts) — siblingOrderLabel() gains a gender param
├── IndividualDetailPanel.tsx    # MODIFY — pass individual.gender to siblingOrderLabel()
└── IndividualForm.tsx           # MODIFY — pass the form's current gender value to siblingOrderLabel()

src/features/tree/
├── useTreeLayout.ts             # MODIFY — sort a parent unit's children by the blood member's siblingOrder (contracts/sibling-order-layout.md)
└── IndividualNode.tsx           # MODIFY — badge tooltip calls the shared siblingOrderLabel() instead of its own hardcoded string

src/pages/Admin/
└── TreeManagement.tsx           # MODIFY — add a "Xem chi tiết" Link(`/${tree.slug}`) per list item

src/features/notifications/
└── NotificationSettingsPanel.tsx  # MODIFY — initialize the template textarea with a sample default when config.template === "" (contracts/sample-email-template.md)

src/features/events/
└── CalendarGrid.tsx             # MODIFY — render events.length instead of the 🎉 emoji

tests/unit/          # existing Vitest + RTL suites — extend for individualService, formatters, useTreeLayout, CalendarGrid
tests/e2e/           # existing Playwright suite — extend for the delete flow, tree-list CTA, and template default
```

**Structure Decision**: Purely additive/modification work inside the existing single-project Vite/React SPA (`src/`) plus one additive Supabase migration — no new top-level directories, no new backend service. Every change lives in the existing `src/features/<domain>/` (or `src/pages/Admin/`) module it augments, following the convention already established by features 002–004.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
