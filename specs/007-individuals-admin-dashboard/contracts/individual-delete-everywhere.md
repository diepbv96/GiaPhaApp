# Contract: Delete an individual entirely from the dashboard

**Modules**: `src/features/individuals/DeleteIndividualDialog.tsx` (reused, copy change only), `src/features/individuals/individualService.ts`'s `deleteIndividual()` (rewritten to call a new RPC), `supabase/migrations/0022_delete_individual_everywhere.sql`'s `delete_individual_everywhere()` function

This supersedes/extends `specs/005-usability-enhancements/contracts/delete-individual.md` for the multi-tree case that migration `0017` (spec 006) introduced after that contract was written; it does not change that contract's steps 1-4 for a single-tree individual.

## Behavior

1. Dashboard row's "Xoá" action opens `DeleteIndividualDialog` with `individual` set to the row's data and `relationshipCount` computed the same way `TreeWorkspace.tsx` already does (count of `relationships` rows referencing this individual — for the dashboard, this must be a system-wide count across every tree the person belongs to, not just one tree's `graph`, since this dialog's deletion is always system-wide; see "Relationship count source" below).
2. Confirmation copy (FR-011): if `relationshipCount > 0`, the existing relationship-cascade warning + checkbox is shown, **plus one added sentence** stating the individual will also be removed from every family tree they belong to. If `relationshipCount === 0` but the individual belongs to more than one family tree, the existing "cannot be undone" copy is likewise extended to mention all memberships being removed. (Today's dialog copy only ever mentions relationships, never memberships — this is the one required text change, applied to the shared component and therefore also visible, harmlessly and truthfully, in its original tree-canvas context.)
3. On confirm, calls the existing `deleteIndividual(id, { cascadeRelationships: true })` — the dashboard always passes `cascadeRelationships: true` (no partial/tree-scoped delete option is exposed here; FR-010 is always a full delete).
4. `deleteIndividual()` calls a single RPC, `supabase.rpc("delete_individual_everywhere", { target_id: id, cascade_relationships })`, which runs every step in one atomic transaction: existence check → (if `cascade_relationships`) delete all relationships referencing the person, any tree → null out `import_row_results.individual_id` → delete the `individuals` row. The `individuals`-row delete cascades (`ON DELETE CASCADE`) to remove every `individual_tree_memberships` row for that person; this now succeeds correctly for multi-tree individuals because of the `enforce_last_tree_membership()` fix in migration `0021` (data-model.md).
5. On success: close the dialog, remove the row from the dashboard's list (or refetch), invalidate `["tree-graph"]` broadly so any open tree canvas no longer shows the deleted individual.
6. On failure: existing plain-text error display is reused.

## Error handling additions (FR-013)

**Revised after a real bug found in manual testing**: the original design had `deleteIndividual()` issue three separate requests (optionally delete relationships, null `import_row_results.individual_id`, delete `individuals`) as three separate implicit transactions. In practice, the final delete could still fail with `23503` on `import_row_results_individual_id_fkey` — for an individual with **zero** relationships — and the client's blanket "any `23503` means relationships" assumption then showed a misleading "cá thể này vẫn còn mối quan hệ" (still has relationships) error, even though the real blocker was unrelated import bookkeeping the user has no way to act on from that dialog.

Fixed by moving every step into `delete_individual_everywhere()` (migration `0022`), a single `plpgsql` function (`security invoker`, so RLS is still evaluated per-statement using the caller's role, same as every other table access) executed as one transaction — mirroring `set_default_family_tree()`'s existing rationale (`0008_family_tree_functions.sql`). This function:
- Raises a custom `INDIVIDUAL_NOT_FOUND` exception (mapped client-side to `DataAccessError("NOT_FOUND", "Cá thể này đã bị xoá trước đó.")`, closing the original silent-no-op gap this task set out to fix) if the individual is already gone.
- Unconditionally nulls `import_row_results.individual_id` **before** the final delete, in the same transaction — so by the time the `individuals` row delete runs, that FK can never be the blocker. A `23503` from the final delete can now only mean `relationships` still references the person, making the existing "vẫn còn mối quan hệ" message accurate again.

## Relationship count source (dashboard-specific)

`TreeWorkspace.tsx` derives `relationshipCount` from the currently-open tree's `graph.relationships` — correct there because that view is already tree-scoped. The dashboard has no single "current tree" context, so its equivalent count must be computed system-wide (e.g. a small query counting `relationships` rows with `person_a_id.eq.<id>,person_b_id.eq.<id>` with no `family_tree_id` filter, or reusing/exposing the count that `deleteIndividual` itself would act on). This is a new, small read, not a new error code or new user-facing behavior — it only ensures the checkbox/warning in step 2 reflects the true, system-wide relationship count rather than under-counting.

## Preconditions / non-goals

- Does not introduce a "remove from one tree only" action on this dashboard — that capability already exists separately via `ManageTreeMembershipDialog` (spec 006) and is out of scope here, per spec 007's resolved clarification (full delete only).
- Does not change `enforce_no_relationships_before_membership_removal` — already satisfied by the existing relationship-cascade-first ordering (research.md §4).
