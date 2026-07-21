# Contract: sibling ordering in the tree layout + ordinal label

## 1. Unit child-sort comparator

**Module**: `src/features/tree/useTreeLayout.ts`

Replaces the plain `.sort()` at the current `unitChildrenOf.get(id).map(buildUnitNode)` call (today: alphabetical by unit id) with a comparator applied only to a **parent unit's own children** (not to `unitRoots`, which have no shared parent — research.md §2):

```ts
function siblingOrderOf(unitId: string): number {
  return unitSiblingOrderOf.get(unitId) ?? Number.POSITIVE_INFINITY;
}

function compareUnitSiblings(a: string, b: string): number {
  const byOrder = siblingOrderOf(a) - siblingOrderOf(b);
  if (byOrder !== 0) return byOrder;
  return a < b ? -1 : a > b ? 1 : 0; // existing id tie-break, unchanged
}
```

Where `unitSiblingOrderOf: Map<string, number | undefined>` is populated during the existing step-3 parent-resolution pass (`useTreeLayout.ts:112-122`): for the same member id that pass already identifies as the unit's link to its parent unit, record that member's `Individual.siblingOrder` against the unit id.

**Guarantees**:
- Units whose blood member has a recorded `siblingOrder` sort strictly before any unit whose blood member does not (via `?? Infinity`).
- Two units with the same recorded `siblingOrder` (data-entry duplicate) fall back to the existing id-based order between themselves — no error, no new validation.
- Units with no shared parent (`unitRoots`) are unaffected — sorted exactly as today.

## 2. `siblingOrderLabel()`

**Module**: `src/lib/formatters.ts`

### Before

```ts
export function siblingOrderLabel(order?: number): string
```

### After

```ts
export function siblingOrderLabel(order: number | undefined, gender: Gender): string
```

| `order` | `gender` | Return value |
|---|---|---|
| `undefined` | any | `"Chưa rõ / con một"` (unchanged) |
| `2` | `"male"` | `"Con Trai Trưởng"` |
| `2` | `"female"` | `"Con Gái Trưởng"` |
| `2` | `"unknown"` | `"Con Trưởng"` |
| `3`, `4`, `5`, ... | any | `` `Con thứ ${order}` `` (unchanged) |

### Call sites (all three MUST pass `gender`)

- `src/features/individuals/IndividualDetailPanel.tsx` — pass `individual.gender` (already in scope).
- `src/features/individuals/IndividualForm.tsx` — pass the form's current `gender` field value (already in scope, used for the live preview while entering the order number).
- `src/features/tree/IndividualNode.tsx` — **new** call site; replaces the badge tooltip's own hardcoded `` `Thứ ${individual.siblingOrder} trong các anh/chị/em` `` string with `siblingOrderLabel(individual.siblingOrder, individual.gender)`, so the tree badge and the detail panel can never disagree again.
