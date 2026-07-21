# Contract: Edit an individual from the dashboard

**Modules**: `src/features/individuals/IndividualForm.tsx` (reused, unmodified props/behavior), `src/features/individuals/individualService.ts`'s existing `updateIndividual()` (one error-mapping addition)

## Behavior

1. Dashboard row's "Sửa" action opens `IndividualForm` in a `Modal`, with `initialIndividual` set to the selected row's `Individual` data, `treeId` set to any non-empty placeholder (never read in edit mode — confirmed by trace in research.md §6), and `existingIndividuals` omitted (defaults to `[]`, which also correctly hides the create-only "Liên kết với" relationship-linking section).
2. On submit, `IndividualForm` calls the existing `updateIndividual(initialIndividual.id, input)` unchanged — same validation (`individualFormSchema`), same field set (name, alias, gender, birth/death, deceased status, sibling order, notes, avatar).
3. On success: close the modal, invalidate the dashboard's list query (`["individuals", "admin", ...]`) so the row reflects the change immediately (FR-009), and invalidate `["tree-graph"]` broadly (same invalidation this app already performs after any individual mutation, e.g. `TreeWorkspace.tsx`'s `refreshAllTreeGraphs()`) so any open tree canvas view also reflects the change.
4. On failure: `IndividualForm`'s existing error rendering (`setSubmitError(message)` / toast) already displays whatever message `updateIndividual` throws — no new UI needed.

## Error mapping addition (FR-008, FR-013)

`toDataAccessError()` in `individualService.ts` gains one new case: Postgres/PostgREST code `PGRST116` ("no rows returned" from `.single()`) → `DataAccessError("NOT_FOUND", "Cá thể này không còn tồn tại (có thể đã bị người khác xoá).")`. `updateIndividual` already pipes every error through `toDataAccessError()`, so this fix applies with no change to `updateIndividual`'s own body. The dashboard, on receiving a `NOT_FOUND` error, closes the modal and removes/refreshes the row from the list rather than leaving a modal open against a record that no longer exists.

Existing validation error mapping (e.g. blank `full_name` → the DB `CHECK` constraint's `23514` code, already mapped to `VALIDATION_FAILED`) is unchanged and continues to satisfy FR-008.

## Preconditions / non-goals

- Does not add any field beyond what `IndividualForm` already captures — matches spec's Assumption that no new fields are introduced.
- Does not change `IndividualForm`'s create-mode behavior at all; the placeholder `treeId` is never exercised by any code path when `initialIndividual` is set.
