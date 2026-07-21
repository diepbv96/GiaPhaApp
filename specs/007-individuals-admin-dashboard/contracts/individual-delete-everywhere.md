# Contract: Delete an individual entirely from the dashboard

**Modules**: `src/features/individuals/DeleteIndividualDialog.tsx` (reused, copy change only), `src/features/individuals/individualService.ts`'s existing `deleteIndividual()` (one trigger fix relied upon, one NOT_FOUND pre-check added)

This supersedes/extends `specs/005-usability-enhancements/contracts/delete-individual.md` for the multi-tree case that migration `0017` (spec 006) introduced after that contract was written; it does not change that contract's steps 1-4 for a single-tree individual.

## Behavior

1. Dashboard row's "Xoá" action opens `DeleteIndividualDialog` with `individual` set to the row's data and `relationshipCount` computed the same way `TreeWorkspace.tsx` already does (count of `relationships` rows referencing this individual — for the dashboard, this must be a system-wide count across every tree the person belongs to, not just one tree's `graph`, since this dialog's deletion is always system-wide; see "Relationship count source" below).
2. Confirmation copy (FR-011): if `relationshipCount > 0`, the existing relationship-cascade warning + checkbox is shown, **plus one added sentence** stating the individual will also be removed from every family tree they belong to. If `relationshipCount === 0` but the individual belongs to more than one family tree, the existing "cannot be undone" copy is likewise extended to mention all memberships being removed. (Today's dialog copy only ever mentions relationships, never memberships — this is the one required text change, applied to the shared component and therefore also visible, harmlessly and truthfully, in its original tree-canvas context.)
3. On confirm, calls the existing `deleteIndividual(id, { cascadeRelationships: true })` — the dashboard always passes `cascadeRelationships: true` (no partial/tree-scoped delete option is exposed here; FR-010 is always a full delete).
4. `deleteIndividual()`'s existing steps run unchanged: delete all relationships referencing the person (any tree) → null out `import_row_results.individual_id` → delete the `individuals` row. The `individuals`-row delete cascades (`ON DELETE CASCADE`) to remove every `individual_tree_memberships` row for that person; this now succeeds correctly for multi-tree individuals because of the `enforce_last_tree_membership()` fix in the accompanying migration (data-model.md) — no application-code change is needed for this part, only the DB-side trigger fix.
5. On success: close the dialog, remove the row from the dashboard's list (or refetch), invalidate `["tree-graph"]` broadly so any open tree canvas no longer shows the deleted individual.
6. On failure: existing plain-text error display is reused.

## Error handling additions (FR-013)

`deleteIndividual()` gains an explicit pre-check: before attempting the relationship/individual deletes, confirm the individual row still exists (e.g. a `select id` with `.maybeSingle()`); if not, throw `DataAccessError("NOT_FOUND", "Cá thể này đã bị xoá trước đó.")` immediately, without attempting any delete. This closes the current silent-no-op gap (a `.delete().eq("id", id)` against a nonexistent id today returns no error and no effect). The dashboard, on `NOT_FOUND`, closes the dialog and removes the row from the list rather than showing a false success.

## Relationship count source (dashboard-specific)

`TreeWorkspace.tsx` derives `relationshipCount` from the currently-open tree's `graph.relationships` — correct there because that view is already tree-scoped. The dashboard has no single "current tree" context, so its equivalent count must be computed system-wide (e.g. a small query counting `relationships` rows with `person_a_id.eq.<id>,person_b_id.eq.<id>` with no `family_tree_id` filter, or reusing/exposing the count that `deleteIndividual` itself would act on). This is a new, small read, not a new error code or new user-facing behavior — it only ensures the checkbox/warning in step 2 reflects the true, system-wide relationship count rather than under-counting.

## Preconditions / non-goals

- Does not introduce a "remove from one tree only" action on this dashboard — that capability already exists separately via `ManageTreeMembershipDialog` (spec 006) and is out of scope here, per spec 007's resolved clarification (full delete only).
- Does not change `enforce_no_relationships_before_membership_removal` — already satisfied by the existing relationship-cascade-first ordering (research.md §4).
