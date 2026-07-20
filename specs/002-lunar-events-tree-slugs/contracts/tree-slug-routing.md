# Contract: Family Tree Slug & Routing

## Slug generation/validation (`src/lib/slug.ts`)

```text
slugify(name: string): string
isValidSlug(candidate: string): boolean
```

- `slugify`: NFD-normalizes `name`, maps Vietnamese `đ`/`Đ` → `d`/`D` (not handled by NFD alone), strips remaining diacritics, lowercases, collapses runs of non-`[a-z0-9]` characters into a single `-`, trims leading/trailing `-`. Pure string function — no database access.
- `isValidSlug`: `true` only for non-empty strings matching `^[a-z0-9]+(-[a-z0-9]+)*$`. Used to validate a user-supplied edit before it is ever sent to the database (spec FR-015).
- Uniqueness is **not** decided by this module — it is enforced by the database `UNIQUE` constraint on `family_trees.slug` (data-model.md). The client generates a candidate, and on a uniqueness conflict response, appends the next available numeric suffix (`-2`, `-3`, ...) and retries, per spec Assumptions.

## Creation flow

1. Admin names a new tree.
2. Client calls `slugify(name)`, then attempts to create the row; on a unique-constraint conflict, retries with an incrementing suffix until it succeeds (spec FR-014, acceptance scenario 1).

## Edit flow

1. Admin edits an existing tree's slug field.
2. Client validates with `isValidSlug` before submitting.
3. Server (`UNIQUE` constraint + RLS restricting this update to Admin) is the final authority — a conflicting or malformed value is rejected with an error surfaced back to the Admin (spec FR-015, acceptance scenario 2); the previous slug is left unchanged on rejection (Edge Cases).
4. Editing `name` alone never touches `slug` (Edge Cases — only an explicit slug edit changes it).

## Routing contract (`react-router-dom`)

| Route | Resolution |
|---|---|
| `/` (home) | Loads the tree where `is_default = true` and requires `is_public = true` for guest access, exactly as in 001 — unaffected by this feature (spec FR-016, SC-008). If no tree is currently marked default+public, shows the existing "not published" message (Edge Cases). |
| `/:slug` | Looks up the tree by `slug`. If found and the requester is authenticated, or the tree's `is_public = true` for a guest, the tree loads (spec FR-017, acceptance scenario 4). If not found, or found but the requester is an unauthenticated guest on a non-public tree, the route shows an access-denied message rather than any tree content (spec FR-018, acceptance scenario 5) — this reuses the existing `family_trees`/`individuals` RLS `select` policy (data-model.md) rather than introducing a second access-control mechanism, since any authenticated user with a `profiles` row already has `select` on every tree today (001's RLS table); "publishable" for a guest is exactly `is_public = true` (spec Clarifications). |

No new RLS policy is required for `/:slug` beyond what already exists on `family_trees`/`individuals`/`relationships` — this route is purely a new *lookup key* (by `slug` instead of only by `is_default`) into data access that is already correctly scoped.
