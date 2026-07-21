# Implementation Plan: Individuals Admin Dashboard

**Branch**: `007-individuals-admin-dashboard` | **Date**: 2026-07-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-individuals-admin-dashboard/spec.md`

## Summary

A new admin/editor-only page (`/quan-tri/ca-nhan`) listing every individual across every family tree, with server-side pagination, a family-tree filter, and a diacritic-tolerant name/alias search — all genuinely new, since this app has never queried `individuals` across trees, paginated any query, or searched by text before (confirmed by research: zero `ilike`/`.range(`/debounce usage anywhere in `src/`). Editing reuses `IndividualForm`/`updateIndividual` as-is (already tree-independent in edit mode). Deleting reuses `DeleteIndividualDialog`/`deleteIndividual` as-is for its actual behavior (it already deletes a person's relationships and individual row system-wide, across every tree, not just one) — but two small, real gaps must be closed first: (1) a delete of a person who belongs to more than one family tree can be spuriously rejected by the existing `enforce_last_tree_membership` trigger racing against its own cascade, and (2) neither `updateIndividual` nor `deleteIndividual` currently detects "this record was already deleted by someone else" (FR-013), both silently falling through to a generic error/no-op instead.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19

**Primary Dependencies**: `@supabase/supabase-js`, `@tanstack/react-query` v5 (already supports `placeholderData: keepPreviousData` for pagination, unused elsewhere so far), `react-hook-form` + `zod` (existing form stack, reused via `IndividualForm`) — no new npm packages

**Storage**: Supabase Postgres — two new migrations: `0021_individuals_admin_search_and_delete_fix.sql` (two generated, indexed columns on `individuals` for diacritic-tolerant search, plus a helper `normalize_search_text()` function; a one-line fix to the existing `enforce_last_tree_membership()` trigger function) and `0022_delete_individual_everywhere.sql` (a new RPC consolidating `deleteIndividual()`'s steps into one atomic transaction, added after manual testing surfaced a real bug — research.md §8). No new tables.

**Testing**: Vitest + React Testing Library (`tests/unit/`), Playwright (`tests/e2e/`) — existing suites

**Target Platform**: Web browser (existing Vite/React SPA) + existing Supabase project (Postgres/RLS)

**Project Type**: Single-project web frontend + Supabase backend (existing structure; no custom API server beyond Postgres functions)

**Performance Goals**: List/search/filter results must return promptly with 1,000+ individuals system-wide (SC-001/SC-005) — met via server-side pagination (fixed page size) and an indexed, pre-normalized search column, so no query ever fetches or filters more than one page of rows client-side.

**Constraints**: Zero new npm dependencies (search debouncing is a ~10-line local hook, not a library). Diacritic-insensitive search must work as a plain Supabase-JS `.ilike()` filter — the client cannot call arbitrary SQL functions (e.g. `unaccent()`) inline in a PostgREST filter, so normalization must be pre-computed and stored (generated columns), following the existing `unaccent`-extension precedent from `0013_family_tree_slug.sql`. Delete must remain enforceable at the database layer (this app's existing "RLS/triggers are authoritative, client is UX-only" convention) rather than by only changing client-side call order.

**Scale/Scope**: One migration, one new/extended service module, one new page component, 2-3 new small subcomponents (search box, tree filter, pagination controls), reuse of two existing components (`IndividualForm`, `DeleteIndividualDialog`) and one existing dialog-copy edit. One new admin route.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (no ratified project-specific principles) — same state observed for features 002–006. No gates apply; nothing to check.

**Post-design re-check**: Unchanged — no gates were introduced by the Phase 1 design artifacts below.

## Project Structure

### Documentation (this feature)

```text
specs/007-individuals-admin-dashboard/
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
├── 0021_individuals_admin_search_and_delete_fix.sql   # NEW — contracts/individuals-search.md, contracts/individual-delete-everywhere.md
└── 0022_delete_individual_everywhere.sql              # NEW — contracts/individual-delete-everywhere.md (added post-implementation, see research.md §8)

src/features/individuals/
├── individualService.ts          # MODIFY — add listIndividualsAdmin(); add NOT_FOUND mapping to updateIndividual()/deleteIndividual() (contracts/individual-edit.md, contracts/individual-delete-everywhere.md)
├── individualSearch.ts           # NEW — normalizeSearchTerm() (mirrors src/lib/slug.ts's diacritic-stripping, no slug-specific hyphenation)
├── DeleteIndividualDialog.tsx    # MODIFY — confirmation copy states removal from all family trees, not just relationships
└── IndividualForm.tsx            # UNCHANGED — reused as-is in edit mode (treeId prop satisfied with a placeholder; already tree-independent for updates)

src/lib/
└── useDebouncedValue.ts          # NEW — small local hook for the search input, no dependency added

src/pages/Admin/
└── IndividualsManagement.tsx     # NEW — the dashboard page: search box, tree filter, paginated list, wires edit (Modal + IndividualForm) and delete (DeleteIndividualDialog)

src/app/router.tsx
└── MODIFY — add `/quan-tri/ca-nhan` route, RequireRole allow={["admin", "editor"]}

tests/unit/
├── individualSearch.test.ts          # NEW
└── individualService.test.ts         # NEW — first unit test for this service; covers listIndividualsAdmin pagination/filter/search and the two NOT_FOUND fixes

tests/e2e/
└── individuals-admin-dashboard.spec.ts   # NEW — mirrors existing test.describe("User Story N - ...") convention
```

**Structure Decision**: Purely additive work inside the existing single-project Vite/React SPA (`src/`) plus one additive/corrective Supabase migration — no new top-level directories, no new backend service, consistent with the convention established by features 002–006.

## Complexity Tracking

*No constitution gates apply (see Constitution Check above) and no structural complexity is introduced — this section is intentionally empty.*
