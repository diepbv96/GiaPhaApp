# Implementation Plan: Bùi Family Genealogy Tree (Gia Phả)

**Branch**: `001-family-tree-app` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-family-tree-app/spec.md`

## Summary

Build a login-gated, single-page web app that renders the Bùi family genealogy tree as an interactive, expandable/collapsible diagram (React Flow for rendering/interaction, D3 for hierarchical layout), backed entirely by Supabase (Postgres + Auth + Storage) as the persistence and access-control layer — no custom backend server. Admin/Editor roles manage individuals and relationships (create/edit/delete) and can bulk-import a tree from a predefined `.xlsx` template; Viewers get read-only access. Up to 5 trees can exist, one flagged as default and shown on the home page. The UI is Vietnamese-only, uses a bright/high-contrast, legible design system, and supports exporting the current tree view as an image/PDF. Supabase credentials are read from a git-ignored `.env` file.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (build tooling); ES2022 target for the browser bundle

**Primary Dependencies**: React 18, Vite (build/dev server), `@xyflow/react` (React Flow) for tree rendering/interaction, `d3-hierarchy` (D3.js) for computing tree layout coordinates, `@supabase/supabase-js` (Postgres/Auth/Storage client), `@tanstack/react-query` (server-state caching), `react-router-dom` (routing), Tailwind CSS (styling/theme), `xlsx` (SheetJS, spreadsheet parsing for import), `html-to-image` + `jspdf` (export current tree view to PNG/PDF), `react-hook-form` + `zod` (form handling/validation)

**Storage**: Supabase-hosted PostgreSQL (individuals, relationships, family trees, profiles/roles, import batches) + Supabase Storage (avatar photos, one object per individual)

**Testing**: Vitest + React Testing Library (unit/component), Playwright (end-to-end critical flows: sign-in, view/expand tree, CRUD, import, export, role restriction)

**Target Platform**: Modern desktop and tablet web browsers (Chrome/Edge/Safari/Firefox, latest 2 versions); responsive layout, no offline requirement

**Project Type**: Web application — frontend-only single-page app against a Backend-as-a-Service (Supabase); no custom API server is built for this feature

**Performance Goals**: Default tree renders within 3s on a normal broadband connection (SC-001); a 200-individual `.xlsx` import fully processes within 5 minutes (SC-004); tree-view export completes within 30s (SC-008)

**Constraints**: Vietnamese-only UI text (FR-026); bright/high-contrast, legible typography suitable for extended reading (FR-022); notes field capped at 100 characters, enforced client- and database-side (FR-007); at most 5 family trees system-wide with exactly one default (FR-016–FR-021); Supabase URL/publishable key supplied via `.env`, which is excluded from version control via `.gitignore` (explicit project requirement)

**Scale/Scope**: Single family lineage app; up to 5 trees, each expected to hold on the order of hundreds of individuals (not millions); small number of concurrent Admin/Editor users, larger but still small number of Viewer users (extended family, not public internet scale)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template (placeholder principle names/descriptions, no ratified version) — this project has not yet adopted a ratified constitution. There are therefore no project-specific principles or gates to check against for this feature. **Result: PASS (no gates defined).** If a constitution is ratified later (`/speckit-constitution`), re-run this check against this plan.

**Post-Phase-1 re-check**: Unchanged — still PASS (no gates defined). `research.md` and `data-model.md` introduce no new external dependencies or architectural choices beyond what's already listed in Technical Context.

## Project Structure

### Documentation (this feature)

```text
specs/001-family-tree-app/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── xlsx-import-template.md
│   └── data-access-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.env.example                  # documents VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (no real values)
.env                          # actual secrets — git-ignored, never committed
.gitignore                    # includes .env

supabase/
├── migrations/                # SQL: tables, constraints, triggers, RLS policies
└── seed/                      # optional sample data for local dev

src/
├── app/                       # app shell, router, providers (React Query, Auth context)
├── pages/                     # Home (default tree), TreeView, Login, Admin (tree/user management)
├── features/
│   ├── tree/                  # React Flow canvas, D3 layout hook, node/edge components, expand-collapse state
│   ├── individuals/           # profile panel, create/edit forms, avatar upload
│   ├── relationships/         # relationship create/edit UI, relationship-type styling
│   ├── trees/                 # tree list, create/delete, set-default (Admin)
│   ├── import/                 # xlsx upload, client-side validation, import summary UI
│   ├── export/                # "export/print current view" action (PNG/PDF)
│   └── auth/                  # Supabase auth forms, session/role context, route guards
├── lib/
│   └── supabase.ts            # Supabase client, initialized from import.meta.env.VITE_SUPABASE_*
├── types/                     # shared TypeScript types/interfaces (mirrors data-model.md)
└── styles/                    # Tailwind config, theme tokens (colors, font)

tests/
├── unit/                      # component/unit tests (Vitest + RTL)
└── e2e/                       # Playwright specs for the user-story acceptance scenarios
```

**Structure Decision**: Single frontend SPA (Vite + React + TypeScript) talking directly to Supabase — matches the "Option 2: Web application" shape but collapses the `backend/` half into Supabase-managed Postgres/Auth/Storage plus SQL migrations under `supabase/`, since no custom API server is needed for this feature. Feature-based folders under `src/features/` keep each user story (view/tree, manage individuals, import, multi-tree/default, export) independently developable and testable, matching the spec's prioritized user stories.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
