# Contract: `listIndividualsAdmin` (list, filter, search, paginate)

**Module**: `src/features/individuals/individualService.ts`

## Signature

```ts
function listIndividualsAdmin(params: {
  page: number;       // 0-based
  pageSize: number;   // fixed by caller, e.g. 25
  treeId?: string;    // optional family-tree filter (FR-003)
  search?: string;    // optional raw user input; normalized internally (FR-004)
}): Promise<IndividualsAdminPage>
```

## Behavior

1. If `search` is provided, normalize it via `normalizeSearchTerm()` (`individualSearch.ts`) — lowercase, `đ`→`d`, strip combining diacritics, trim. Empty-after-trim is treated as no search.
2. Build the selection query against `individuals` with `{ count: "exact" }`:
   - If `treeId` is set: embed `individual_tree_memberships!inner(family_tree_id)` and `.eq("individual_tree_memberships.family_tree_id", treeId)` (same pattern as `treeGraphService.getTreeGraph`).
   - If `search` is set (after normalization): `.or(\`full_name_normalized.ilike.%${term}%,alias_normalized.ilike.%${term}%\`)`.
   - Both filters, if present, apply together (FR-005) — they are independent `.eq()`/`.or()` clauses on the same query, which PostgREST ANDs by default.
   - Order by `full_name` ascending for stable pagination across requests.
   - `.range(page * pageSize, page * pageSize + pageSize - 1)`.
3. If the selection query returns zero rows, return `{ individuals: [], total: <count> }` immediately (no second query needed) — this is the "no results" state (FR-006).
4. Otherwise, run the membership-display query: `individual_tree_memberships` joined to `family_trees(id, name, slug, is_default, is_public)`, `.in("individual_id", <ids from step 2>)`, no tree filter — returns every tree each returned individual belongs to, regardless of the `treeId` filter used in step 2.
5. Merge: for each individual from step 2, attach `familyTrees: FamilyTreeSummary[]` built from step 4's rows matching its id (order not significant; a person's own membership list is typically 1-2 trees given the app's 5-tree cap).
6. Return `{ individuals: IndividualWithTrees[], total: number }`.

## Error mapping

Any Postgres/PostgREST error from either query is thrown as the existing `DataAccessError` shape via `toDataAccessError()` — no new error codes specific to this function; a failed list load surfaces as a generic retryable error (this is a read, not a mutation with domain-specific failure modes).

## Preconditions / non-goals

- Caller (the dashboard page) is responsible for enforcing that only `admin`/`editor` can reach this function at all (via `RequireRole` on the route) — this function itself performs no role check beyond whatever RLS already allows any authenticated user with a profile to read (`individuals_select`), matching how every other read function in this codebase behaves (RLS is authoritative for writes; reads are typically broader and gated by the UI route, e.g. `getTreeGraph`).
- Does not support sorting by any column other than `full_name` — no functional requirement calls for it.
- Does not support filtering by more than one family tree at a time (single-select filter, per spec's Assumptions).
