# Contract: Relationship add/update/delete, scoped to one family tree

**Modules**: `supabase/migrations/0018_relationships_admin_editor_update.sql`, `src/features/relationships/relationshipService.ts`, `src/features/relationships/RelationshipTypeEditor.tsx`, `src/features/individuals/IndividualDetailPanel.tsx`, `src/features/tree/TreeWorkspace.tsx`

## Migration `0018_relationships_admin_editor_update.sql`

```sql
create policy relationships_admin_editor_update on public.relationships
  for update to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]))
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));
```

Same shape as the existing `relationships_admin_editor_delete` (`0007_rls_policies.sql`). Required because FR-010 is otherwise a silent no-op (0 rows affected) under RLS.

## `relationshipService.ts` — `updateRelationship()` (new)

```ts
export async function updateRelationship(id: string, type: RelationshipType): Promise<Relationship>
```

1. Loads the target row's `person_a_id`/`person_b_id` (or accepts them as extra params — implementation detail for tasks.md) to run the same undirected-duplicate pre-check `createRelationship` runs for `spouse`/`sibling` (`type !== "parent_child"` → check both `(a,b)` and `(b,a)` orderings for an existing row with the new `type`, excluding `id` itself).
2. `update({ type }).eq("id", id).select(...).single()`.
3. Error mapping, same as `createRelationship`: `23505` (the `relationships_unique_edge` constraint, which also fires on `UPDATE`) → `DataAccessError("CONFLICT", "Mối quan hệ này đã tồn tại.")`; `42501` → `PERMISSION_DENIED`; the `RELATIONSHIP_TREE_MISMATCH` trigger message is not reachable from a type-only update (endpoints don't change), so no new mapping needed for it here.

## `deleteRelationship()` (existing, unmodified) — now actually wired up

No signature change. This contract's only change is making it reachable from the UI (see below) — today it exists but is dead code.

## UI wiring — `IndividualDetailPanel.tsx` (modified)

- New prop, e.g. `onEditRelationship?: (relationship: Relationship, otherPerson: Individual) => void` and `onDeleteRelationship?: (relationship: Relationship, otherPerson: Individual) => void`, passed only when `canManage` (mirrors how `actions` is already conditionally passed from `TreeWorkspace.tsx`).
- For each person rendered by the existing `PersonList` calls (`relations.parents`, `.spouses`, `.siblings`, `.biologicalChildren`) — **not** `inLawChildren`, which has no direct `Relationship` row of its own (it's derived from the in-law's spouse relationship, per `familyRelations.ts`) — resolve the underlying `Relationship` row from `graph.relationships` by matching `(personAId, personBId)` against `(individual.id, person.id)` in either order. Render an edit/delete affordance per row using that resolved relationship.
- "Edit" opens `RelationshipTypeEditor` (a small type-only picker, not the full `RelationshipForm`, since the two endpoints are fixed once a relationship already exists) → calls `updateRelationship(relationship.id, newType)`.
- "Delete" calls `deleteRelationship(relationship.id)` directly (no cascade concern — deleting one relationship never blocks on anything else, unlike deleting a whole individual).
- Both mutations, on success, invalidate `["tree-graph", treeId]` (same key `TreeWorkspace.tsx` already uses for `refreshGraph()`).

## Selection-list scoping (FR-012/FR-013) — no code change required

`RelationshipForm`'s `individuals` prop is always `graph.individuals` (`TreeWorkspace.tsx:226`), which — after `contracts/tree-membership.md`'s `getTreeGraph` change — is exactly "individuals with a membership row for this tree." No additional filtering logic needs to be written for this requirement; it is a direct consequence of §2/§4 in research.md and is covered by this feature's acceptance tests, not new production code.

## Preconditions

- `admin`/`editor` role for create/update/delete (RLS-enforced). Any authenticated role, and `anon` on public trees, can still read relationships unchanged (`relationships_select`, `relationships_public_select` — untouched by this feature).

## Non-goals

- Does not add a way to change a relationship's two endpoints (`person_a_id`/`person_b_id`) after creation — FR-010 only covers changing `type`; changing *who* is related is delete-and-recreate, unchanged from today.
- Does not add relationship management to `inLawChildren` rows in `IndividualDetailPanel` — those are a derived/computed grouping, not a distinct relationship edge; editing the underlying spouse relationship (reachable via the spouse's own detail panel) already covers it.
