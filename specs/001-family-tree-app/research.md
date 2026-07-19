# Phase 0 Research: Bùi Family Genealogy Tree (Gia Phả)

All items in the Technical Context were specified directly by the project owner (React, TypeScript, React Flow, D3.js, Supabase) or have an unambiguous industry-standard answer for this app's scope. No unresolved `NEEDS CLARIFICATION` markers remain. This document records the supporting decisions, rationale, and alternatives considered for each.

## 1. Combining React Flow and D3.js for the tree diagram

- **Decision**: Use `@xyflow/react` (React Flow) as the rendering/interaction layer (nodes, edges, pan/zoom, selection, expand/collapse UI) and `d3-hierarchy` (specifically `d3.tree()` or `d3.cluster()`) purely as a layout algorithm that computes `{x, y}` positions for each individual node before handing them to React Flow. D3 never touches the DOM directly.
- **Rationale**: React Flow already solves interactive canvas concerns (viewport, zoom, custom node/edge components, minimap) that would be expensive to hand-roll with raw D3+DOM/SVG manipulation. D3's `d3-hierarchy` layout algorithms are purpose-built for exactly this kind of ancestor/descendant tree positioning and are the de facto standard even inside D3-free React apps. Combining them (D3 for math, React Flow for rendering) is a well-established pattern that avoids the two libraries fighting over DOM ownership.
- **Alternatives considered**: Pure D3 with manual SVG rendering and manual zoom/pan/drag handling — rejected, it duplicates functionality React Flow already provides and is harder to keep in sync with React state (expand/collapse, selection). Pure React Flow with its built-in `dagre`/`elkjs` auto-layout — rejected as primary approach because family trees have generational semantics (parents above children, spouses side-by-side) that a genealogy-aware layout (D3 hierarchy, or a custom variant) models more naturally than a generic DAG layout library; D3 was explicitly requested by the project owner.

## 2. Data/server-state layer

- **Decision**: `@supabase/supabase-js` for all reads/writes (Postgres via PostgREST, Auth, Storage), wrapped by `@tanstack/react-query` for caching, request de-duplication, and optimistic updates in the UI.
- **Rationale**: Supabase was mandated as the backend. React Query is the standard companion for a client that talks to a REST-ish API (PostgREST) from React — it removes the need for hand-rolled loading/error/caching state per screen and cleanly models "the currently visible tree" as invalidated/refetched query data after CRUD/import operations.
- **Alternatives considered**: Raw `useEffect` + `useState` data fetching — rejected, error-prone caching/re-fetch logic for a feature with many interdependent views (tree canvas, detail panel, import summary). Redux/RTK Query — rejected as heavier than needed for a Supabase-only, no-custom-backend app.

## 3. Role-based access control (Admin / Editor / Viewer)

- **Decision**: A `profiles` table (one row per `auth.users` id) stores `role`. Postgres Row Level Security (RLS) policies on `individuals`, `relationships`, and `family_trees` enforce that only `admin`/`editor` roles can insert/update/delete, and only `admin` can manage trees (create/delete/set default); all three roles can `select`. The frontend also hides/disables controls per role for UX, but the enforcement of record is the database policy.
- **Rationale**: FR-010/FR-011/FR-020/FR-024 require these rules to actually hold, not just be hinted at in the UI — since there is no custom backend server to place authorization logic in, RLS is the only layer that can't be bypassed by a modified client. This is Supabase's documented, standard approach to per-role authorization.
- **Alternatives considered**: Enforcing role checks only in frontend code — rejected, trivially bypassable (anyone can call the Supabase REST/JS API directly with valid credentials and skip the UI). A custom Edge Function/API layer to mediate all writes — rejected as unnecessary extra surface area; RLS achieves the same guarantee with less code, given Supabase is already the mandated backend.

## 3a. Guest (unauthenticated) viewing of a published tree

- **Decision**: Add `family_trees.is_public`. Grant the Postgres `anon` role a `select`-only RLS policy on `family_trees`/`individuals`/`relationships`, scoped to rows belonging to a tree where `is_public = true`; grant `anon` no `insert`/`update`/`delete` policy anywhere, ever. The `avatars` Storage bucket is also made public-read so guest sessions (which have no auth token to present to Storage) can still load photos via `getPublicUrl`. The frontend's home route no longer requires a session; it renders a sign-in prompt instead of tree content when the fetch comes back empty for a guest.
- **Rationale**: The project owner's stated goal — most family members only need to view the tree, and requiring an account for that is unnecessary friction — is best satisfied by extending the existing RLS-is-authoritative model with one additional, narrowly-scoped anonymous read policy, rather than introducing a second access-control mechanism. Because `anon` never receives a write policy, publishing a tree cannot expand what a guest can *do*, only what they can *see* — the Admin/Editor/Viewer write boundary from research.md §3 is unchanged.
- **Alternatives considered**: A separate public read-only API/view (e.g., a Postgres `security definer` function) — rejected as extra surface area when a same-shaped `anon` RLS policy achieves an identical result with less code. Making the whole app public by default — rejected; the project owner explicitly wants publishing to be an Admin decision per tree, with private-by-default.

## 4. Spreadsheet import

- **Decision**: Parse the uploaded `.xlsx` client-side with `xlsx` (SheetJS) against a predefined column template (see `contracts/xlsx-import-template.md`), validate every row (required fields, date format, gender enum, duplicate check via exact full-name + date-of-birth match against existing individuals), then write valid rows to Supabase in a batch, recording an `import_batches`/row-result summary.
- **Rationale**: SheetJS is the standard, dependency-light library for parsing `.xlsx` in the browser without a server round-trip, matching the "frontend-only + Supabase" architecture. Client-side validation before writing gives immediate, row-level feedback (FR-014) without needing a server-side import worker.
- **Alternatives considered**: Server-side import via a Supabase Edge Function — rejected as unnecessary complexity for expected data volumes (SC-004 targets 200 rows in under 5 minutes, comfortably a client-side operation); could be revisited later if import volumes grow much larger.

## 5. Export/print of the current tree view

- **Decision**: `html-to-image` to rasterize the currently visible React Flow viewport (respecting expand/collapse state) to a PNG, and `jspdf` to optionally wrap that raster into a single-page PDF, triggered by a client-side "Export/Print" action with no server involvement.
- **Rationale**: FR-027/SC-008 only require exporting what's currently on screen (Assumptions: no custom pagination/layout), which a DOM-to-image snapshot satisfies directly and quickly (well under the 30s target). Both libraries are lightweight, widely used, and need no backend support.
- **Alternatives considered**: Server-side rendering/export (e.g., a headless-browser Edge Function) — rejected as disproportionate for a "snapshot what's visible" requirement; browser print (`window.print()`) alone — considered but rejected as the sole mechanism because it doesn't reliably capture the React Flow canvas' custom-styled SVG/canvas content across browsers, whereas a DOM-to-image capture does.

## 6. Styling, theme, and typography

- **Decision**: Tailwind CSS utility classes plus a small set of theme tokens (bright, high-contrast color palette for individuals/relationship types; one legible, full-Vietnamese-diacritic-support font such as "Be Vietnam Pro" or "Inter" for body/UI text).
- **Rationale**: Satisfies FR-022 (bright, legible, comfortable for extended reading) and FR-026 (Vietnamese-only UI, so the font must render Vietnamese diacritics crisply) directly; Tailwind keeps the design system consistent across many small feature components without a heavyweight component library.
- **Alternatives considered**: A full component library (e.g., MUI/Ant Design) — rejected as heavier than needed and harder to restyle into a distinct bright/family-tree-appropriate look; plain hand-written CSS — rejected as slower to keep consistent across the number of components this feature needs.

## 7. Internationalization

- **Decision**: No i18n framework; Vietnamese strings are written directly in components.
- **Rationale**: FR-026 and the spec's Assumptions explicitly scope the UI to Vietnamese-only for this feature, so an i18n abstraction layer would be unused overhead.
- **Alternatives considered**: `react-i18next` with a single `vi` locale "for future-proofing" — rejected per YAGNI; can be introduced later if a second language is ever required.

## 8. Secrets management

- **Decision**: Supabase URL and publishable key are read via Vite's `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, sourced from a git-ignored `.env` file at the project root; a committed `.env.example` documents the required variable names with placeholder values.
- **Rationale**: Directly satisfies the explicit project requirement (secrets in `.env`, `.env` git-ignored). Vite's `VITE_`-prefixed env convention is the standard, documented mechanism for exposing build-time config to a Vite-built browser bundle.
- **Alternatives considered**: Hardcoding config in source — rejected (explicitly disallowed by the project owner and bad practice, since the publishable key would still be fine to expose but the pattern generalizes poorly and violates the explicit instruction); a runtime-fetched config endpoint — rejected as unnecessary for a client-only app with no backend to serve it from.

## 9. Testing strategy

- **Decision**: Vitest + React Testing Library for component/unit-level tests (form validation, role-based rendering, layout math); Playwright for end-to-end coverage of each user story's acceptance scenarios (sign in as each role, view/expand/collapse the default tree, CRUD an individual, import a sample file, export the view, confirm Viewer restrictions).
- **Rationale**: Both are the current standard pairing for a Vite + React + TypeScript SPA; Playwright can drive a real browser against a local Supabase instance (or a seeded test project) to validate RLS-backed role restrictions end-to-end, which unit tests alone cannot prove.
- **Alternatives considered**: Cypress instead of Playwright — either would work; Playwright chosen for native multi-browser support and TypeScript-first API, no strong constraint either way.
