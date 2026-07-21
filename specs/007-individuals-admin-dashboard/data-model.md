# Data Model: Individuals Admin Dashboard

Two migrations. `0021_individuals_admin_search_and_delete_fix.sql`: one new helper function, two new generated columns + indexes on `individuals`, and a one-line fix to an existing trigger function. `0022_delete_individual_everywhere.sql` (added after a real bug found in manual testing — see the Relationship section below): one new RPC function consolidating `deleteIndividual()`'s steps into a single transaction. No new tables. `family_trees` keeps its existing shape.

## `normalize_search_text` (new function)

`public.normalize_search_text(input text) returns text language sql immutable` — `extensions.unaccent(replace(lower(coalesce(input, '')), 'đ', 'd'))`. Exists solely because a generated column's expression must be built entirely from `immutable`-declared functions, and `extensions.unaccent()` itself is `stable`; this wrapper is what `slugify_tree_name()` (`0013_family_tree_slug.sql`) already implicitly relies on being possible, just applied explicitly here (research.md §2 Correction).

## Individual (existing entity `individuals`, additive columns only)

Source: `supabase/migrations/0004_individuals.sql`, `0011_individual_lifecycle_and_layout.sql`; type `Individual` (`src/types/index.ts`).

| Field | Type | Change in this feature |
|---|---|---|
| `full_name_normalized` | `text generated always as (public.normalize_search_text(full_name)) stored`, indexed | **New.** Diacritic- and case-insensitive form of `full_name`, maintained automatically by Postgres on every insert/update — never written to directly. Backs FR-004's name search. Not exposed on the `Individual` TS type (it's a search-only column; `mapIndividualRow` does not read it). |
| `alias_normalized` | `text generated always as (public.normalize_search_text(alias)) stored`, indexed | **New.** Same purpose as above, for `alias`. Backs FR-004's alias matching. |
| all other fields | unchanged | Not touched by this feature; still mapped via the existing `INDIVIDUAL_COLUMNS` constant and `mapIndividualRow`, both of which continue to select/read only the pre-existing columns. |

No change to `individuals`' existing `not null`/`check` constraints, indexes, or RLS policies (`individuals_select`, `individuals_admin_editor_update`, `individuals_admin_editor_delete` already permit everything this feature needs — see research.md §7).

## Individual–Family Tree Membership (existing entity `individual_tree_memberships`, trigger fix only)

Source: `supabase/migrations/0017_individual_tree_memberships.sql`. No column, index, or RLS change.

- **`enforce_last_tree_membership()` — fixed.** Previous body: raise `LAST_TREE_MEMBERSHIP` whenever the membership row being deleted is the individual's only remaining one, unconditionally. **New body** adds one guard before that check: if the referenced `individuals` row no longer exists (i.e., this deletion is happening as part of cascading a full person-delete within the same transaction, not a standalone membership removal), skip the check and allow the delete. This is what makes deleting a multi-tree-member's `individuals` row correctly cascade-remove *all* of their membership rows (research.md §4) — the single-tree "remove from just this tree" path (`removeIndividualFromTree`, where the individual row still exists) is completely unaffected and still protected exactly as before.
- **`enforce_no_relationships_before_membership_removal()` — unchanged.** Already satisfied for the full-delete path because `deleteIndividual({ cascadeRelationships: true })` deletes every relationship referencing the person, in every tree, before the `individuals` row (and therefore the membership cascade) is touched.
- All existing RLS policies (`individual_tree_memberships_select`, `_admin_editor_insert`, `_admin_editor_delete`, `_public_select`) — unchanged.

## Relationship (existing entity `relationships`, no change)

Source: `supabase/migrations/0005_relationships.sql`. Deleting an individual's relationships (any tree) before deleting the individual row is `deleteIndividual()`'s existing behavior when `cascadeRelationships` is passed — this feature always passes it (FR-010: deletion is always full/system-wide, no partial-delete option is exposed on this dashboard).

## `delete_individual_everywhere` (new function, migration `0022`)

`public.delete_individual_everywhere(target_id uuid, cascade_relationships boolean default false) returns void language plpgsql security invoker` — `revoke all from public`, `grant execute to authenticated` (same shape as `set_default_family_tree()`, `0008_family_tree_functions.sql`). Runs, as one transaction:
1. Raise `INDIVIDUAL_NOT_FOUND` (`errcode 'P0002'`) if `target_id` doesn't exist — mapped client-side to `DataAccessError("NOT_FOUND", "Cá thể này đã bị xoá trước đó.")` (FR-013).
2. If `cascade_relationships`, delete every `relationships` row referencing `target_id`, in any tree.
3. Unconditionally null `import_row_results.individual_id` where it references `target_id`.
4. Delete the `individuals` row (cascades to `individual_tree_memberships` per the `0021` trigger fix above).

**Why this exists**: `deleteIndividual()` originally issued steps 2-4 as three separate PostgREST requests (three separate implicit transactions). Manual testing surfaced a real case — an individual with **zero relationships**, previously created via bulk `.xlsx` import — where the final `delete from individuals` still failed with `23503` on `import_row_results_individual_id_fkey`, and the client's error handling (which only knew how to blame `relationships` for any `23503`) reported a misleading "cá thể này vẫn còn mối quan hệ" message. Making every step part of one atomic function call removes any cross-request ordering ambiguity and guarantees that by the time the final delete runs, `import_row_results` can never be the blocker — so a `23503` from that delete can now only mean `relationships` still references the person, restoring the accuracy of the existing error message. `security invoker` (not `definer`) means each statement inside the function is still evaluated against the calling user's RLS policies exactly as if issued directly — no new privilege escalation, consistent with this app's "RLS is authoritative" convention.

## Family Tree (existing entity `family_trees`, no change)

Source: `supabase/migrations/0003_family_trees.sql`. Used read-only here, as the source of the dashboard's tree-filter dropdown options (`getFamilyTrees()`, already existing) and as the joined display data (`family_trees(id, name, slug)`) for each individual's list of memberships.

## New application-level types (not database entities)

Defined in `src/features/individuals/individualService.ts` (or `src/types/index.ts`, alongside existing types):

```ts
export interface IndividualWithTrees extends Individual {
  familyTrees: FamilyTreeSummary[]; // every tree this individual is a member of — from the membership-display query (research.md §1), independent of any active tree filter
}

export interface IndividualsAdminPage {
  individuals: IndividualWithTrees[];
  total: number; // exact count matching the current filter/search, for pagination controls (SC-001)
}
```

`FamilyTreeSummary` is the existing type (`{ id, name, slug, isDefault, isPublic }`, `src/types/index.ts`) — reused as-is, not extended.

## Row Level Security summary (this feature's changes only)

| Table | Policy | Change |
|---|---|---|
| `individuals` | `individuals_select`, `individuals_admin_editor_update`, `individuals_admin_editor_delete` | None — already sufficient (research.md §7). |
| `individual_tree_memberships` | (all existing policies) | None — only the trigger *function body* changes, not any policy. |

No new RLS policy is added by this feature.
