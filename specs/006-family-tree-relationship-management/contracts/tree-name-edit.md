# Contract: Family tree rename

**Module**: `src/features/trees/treeService.ts`, `src/features/trees/TreeNameField.tsx`

## Signature (new)

```ts
export async function updateFamilyTreeName(treeId: string, name: string): Promise<FamilyTreeSummary>
```

## Behavior

1. Sends `update({ name }).eq("id", treeId)` against `family_trees`, `.select(TREE_COLUMNS).single()` — same shape as `updateTreeSlug`.
2. Error mapping (mirrors `updateTreeSlug`):
   - Postgres `23514` (the existing `check (char_length(trim(name)) > 0)` constraint) → `DataAccessError("VALIDATION_FAILED", "Tên cây gia phả không được để trống.")`
   - `42501` (RLS rejection — non-admin) → `DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể sửa tên cây gia phả.")`
   - anything else → `DataAccessError("UNKNOWN", "Không thể sửa tên cây gia phả.")`
3. On success, returns the updated `FamilyTreeSummary` (unchanged shape — `name` is the only field this contract touches).

## `TreeNameField` component contract

Props: `{ treeId: string; currentName: string; onSaved?: (newName: string) => void; onCancel?: () => void }` — same prop shape as `SlugField`.

- Local `value` state initialized from `currentName`; trims on submit.
- Save button disabled when `value.trim() === "" || value.trim() === currentName` or while the mutation is pending (same disabled-condition pattern as `SlugField`'s `value === currentSlug`).
- On success: `queryClient.invalidateQueries({ queryKey: ["family-trees"] })`, toast `Đã cập nhật tên: {name}`, call `onSaved`.
- On error: toast the thrown `DataAccessError`'s message.

## Preconditions

- Caller's role has `UPDATE` permission on `family_trees` — already granted to `admin` only by the existing `family_trees_admin_update` policy (no new migration).

## Non-goals

- Does not touch `slug` — an explicit, separate action (`SlugField`) continues to be the only way to change a tree's slug, per spec.md's Edge Cases ("only an explicit slug edit changes it").
- Does not enforce name uniqueness across trees — spec.md's Assumptions explicitly allow duplicate tree names.
