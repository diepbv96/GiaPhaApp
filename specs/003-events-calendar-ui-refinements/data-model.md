# Phase 1 Data Model: Events, Calendar & Navigation UI Refinements

**No schema changes.** This feature does not add, remove, or modify any table, column, enum, or RLS policy from `specs/001-family-tree-app/data-model.md` or `specs/002-lunar-events-tree-slugs/data-model.md`.

## Why there is nothing here to model

Every requirement in `spec.md` is one of:

- **A UI/routing change** (which page component renders, which route resolves which tree) — User Stories 1, 2.
- **A presentation/formatting change** (`formatLunarDate`'s output string, calendar layout) — User Story 3.
- **A copy change** (two renamed labels) — User Story 4.

The one requirement that sounds like it could be a permissions change — full Admin/Editor management parity on a slug-viewed, non-default tree (spec FR-002) — is **not**, because it already exists at the database layer. `supabase/migrations/0007_rls_policies.sql`'s `individuals_admin_editor_insert/update/delete` and `relationships_admin_editor_insert/delete` policies check `profiles.role` only; they contain no condition on `family_trees.is_default`. An Admin/Editor could already have written to a non-default tree's `individuals`/`relationships` rows via the Supabase client directly — this feature only builds the frontend UI (`TreeWorkspace`, reused on both `Home` and `TreeBySlug`) that was previously missing for that already-permitted action. See `research.md` §1 for the verification, and `contracts/tree-workspace-navigation.md` for the resulting UI contract.

## Entities referenced (unchanged)

- `family_trees` (`id`, `name`, `slug`, `is_default`, `is_public`) — read via `getFamilyTreeBySlug`/`getDefaultFamilyTree`, exactly as introduced in 002. No new fields needed to resolve "which tree does this route mean."
- `individuals`, `relationships` — read/written exactly as in 001/002; only the *route* that reaches the existing create/edit/delete UI changes, not the data or its access rules.
- `LunarDate`, `LifeEvent` (computed, non-persisted, from 002) — unchanged shape; only their string *formatting* (`formatLunarDate`) and *layout* (calendar/popup) change.
