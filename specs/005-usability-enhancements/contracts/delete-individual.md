# Contract: `deleteIndividual()` cascade delete

**Module**: `src/features/individuals/individualService.ts`

**Superseded by `specs/007-individuals-admin-dashboard/contracts/individual-delete-everywhere.md`**: the three-separate-request shape below (steps 1-3, each its own implicit transaction) turned out to still allow the exact failure this contract's own "Ordering rule" was written to prevent — deleting a zero-relationship, import-created individual could still hit `23503` on `import_row_results_individual_id_fkey` despite step 2 correctly running before step 3. `deleteIndividual()` now delegates to a single-transaction RPC, `delete_individual_everywhere()` (migration `0022_delete_individual_everywhere.sql`), which removes the three-separate-requests structure entirely rather than further patching it. This file is kept for history; do not use it as the current contract.

## Signature (unchanged)

```ts
export async function deleteIndividual(
  id: string,
  opts?: { cascadeRelationships?: boolean },
): Promise<void>
```

## Behavior (updated)

1. If `opts?.cascadeRelationships` is `true`: delete every `relationships` row where `person_a_id = id OR person_b_id = id` (unchanged from today).
2. **New, unconditional step** (runs regardless of `cascadeRelationships`): update every `import_row_results` row where `individual_id = id`, setting `individual_id = null`.
3. Delete the `individuals` row where `id = id`.
4. If step 3 fails with Postgres error code `23503` (foreign-key violation — meaning some *other*, not-yet-known blocker still references this individual), throw `DataAccessError("CONFLICT", "Không thể xoá: cá thể này vẫn còn mối quan hệ. Hãy xoá mối quan hệ trước hoặc xác nhận xoá cả mối quan hệ.")`, unchanged message/code for any remaining case.
5. Any other error from steps 1–3 is mapped via the existing `toDataAccessError()`.

## Ordering rule

Step 2 (import-result cleanup) MUST run before step 3 (individual delete) in every call, independent of whether step 1 ran — this is what fixes the case in research.md §1 (an individual with zero relationships that still fails to delete because of an import-history reference).

## Preconditions

- The caller's role has `UPDATE` permission on `import_row_results` (added by migration `0016_import_row_results_admin_editor_update.sql` — admin/editor, mirroring the existing `relationships_admin_editor_delete` role check) and `DELETE` permission on `relationships`/`individuals` (unchanged, pre-existing policies).

## Non-goals

- Does not delete or modify the `import_batches` parent row, its counters, or the `import_row_results` row itself — only nulls the dangling `individual_id` reference (data-model.md, "Lifecycle note").
- Does not attempt to enumerate or clear any *other* hypothetical foreign key beyond `relationships` and `import_row_results` — those are the only two tables found to reference `individuals(id)` with a delete-blocking constraint (research.md §1 grep of all migrations). If a future migration adds another such reference, step 4's fallback error still applies, but this feature does not add speculative handling for it.
