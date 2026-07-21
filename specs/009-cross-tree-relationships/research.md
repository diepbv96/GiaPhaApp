# Research: Cross-Tree Relationship Visibility

## §1. Where relationship visibility is currently decided

`getTreeGraph(treeId)` (`src/features/tree/treeGraphService.ts:21-48`) fetches individuals and relationships with two independent, parallel queries:

- Individuals: `individual_tree_memberships!inner(family_tree_id)`, filtered `.eq("individual_tree_memberships.family_tree_id", treeId)` — already membership-based (spec 006), so a person shows up in every tree they're a member of.
- Relationships: `.eq("family_tree_id", treeId)` (`treeGraphService.ts:33-34`) — filtered by the relationship row's *own* `family_tree_id` column, i.e. whichever single tree it happened to be created in. This is the entire bug: it never considers `individual_tree_memberships` at all, so a relationship "sticks" to its creation tree even after both endpoints later become members of another tree.

**Decision**: change the relationships query to depend on the same membership data individuals already use, instead of the relationship's own `family_tree_id`. Concretely: after fetching the tree's member individuals, derive their ids and require both `person_a_id` and `person_b_id` to be in that set (`.in("person_a_id", memberIds).in("person_b_id", memberIds)`), rather than filtering on `relationships.family_tree_id`.

**Rationale**: This is the minimal change that makes relationship visibility follow the same rule individuals already follow ("member of this tree" = `individual_tree_memberships`), satisfying FR-001/FR-002/FR-004 without touching how relationships are created, stored, or counted. Chaining two `.in()` calls on different columns in supabase-js/PostgREST combines as AND (each filter is a separate query-string parameter; PostgREST ANDs distinct params), giving exactly "both endpoints are members of this tree" in one query.

**Alternatives considered**:
- *New Postgres RPC/view joining both tables server-side in one round trip.* Rejected: every other read path in this codebase (`getTreeGraph`, `listIndividualsAdmin`, etc.) uses plain sequential/parallel supabase-js queries; RPCs in this project are reserved for atomic multi-statement *writes* (`set_default_family_tree`, `delete_individual_everywhere`). Introducing a read-only RPC/view here would be a new pattern for no real benefit at this data scale.
- *Client-side filtering after a broader `.or()` fetch* (fetch relationships referencing any member, then filter in JS for "both sides present"). Rejected in favor of doing the same filter in SQL via `.in().in()` — equivalent result, less data over the wire, no new client-side helper to maintain/test.

## §2. Scale of the `.in()` id list

The app already caps the system at 5 family trees total (`plan.md` of spec 008, confirmed via `family_trees_limit_check` trigger, `0003_family_trees.sql`), so per-tree member counts stay in the "family tree" range (tens to a few hundred), not an unbounded dataset. `getTreeGraph()` already loads a tree's *entire* graph in one shot with no pagination (existing behavior, unchanged by this feature), so adding member ids to a query-string `.in()` filter is consistent with the existing scale assumption and introduces no new performance concern.

**Decision**: two sequential queries (fetch member individuals, then fetch relationships filtered by their ids) is an acceptable, simple trade-off — one extra round trip's worth of latency in exchange for correctness, at a data scale where that latency is not observable to users.

## §3. Guest (anon) visibility — RLS, not just the client query

For `authenticated` users, `relationships_select` (`0007_rls_policies.sql:81-82`) is `using (public.has_profile())` — unrestricted by tree; **all** tree-scoping for authenticated users happens client-side in the query, same as individuals. So the client-side fix in §1 is sufficient for admins/editors/viewers with an account.

For unauthenticated guests viewing a public tree, though, `relationships_public_select` (`0009_public_tree_access.sql:28-35`) *does* gate at the RLS layer, and it has the identical bug as the client query: `using (exists (select 1 from family_trees where family_trees.id = relationships.family_tree_id and family_trees.is_public))` — keyed off the relationship's own `family_tree_id`, not membership. This was already fixed once for individuals in `0019_public_tree_membership_visibility.sql` (which rewrote `individuals_public_select` and added `individual_tree_memberships_public_select` to key off membership instead of `individuals.family_tree_id`); `relationships_public_select` was missed in that pass because at the time (spec 006/019) relationships weren't yet expected to follow membership across trees.

**Decision**: add a new migration rewriting `relationships_public_select` to the membership-based check: a relationship is visible to `anon` if there exists a public tree where both `person_a_id` and `person_b_id` are members (mirrors the join shape `0019` already established for `individual_tree_memberships_public_select`).

**Rationale**: Without this, a guest viewing a public tree would see fewer relationships than an authenticated viewer of the exact same tree — an inconsistency the spec's Assumptions section explicitly rules out ("Guest/public viewers are subject to the same visibility rule as admins/editors").

## §4. Everything that does *not* need to change

Confirmed by reading each remaining consumer of `relationships.family_tree_id`:

- **`createRelationship()` / `updateRelationship()`** (`relationshipService.ts:7-101`): duplicate-prevention already checks `(type, person_a_id, person_b_id)` globally, with no `family_tree_id` in the check or in the `relationships_unique_edge` unique constraint (`0005_relationships.sql:11`) — a relationship is already a single record shared across trees at the data layer. FR-003/FR-007 need no code change; this is existing, already-correct behavior this feature's display fix relies on.
- **`deleteRelationship(id)`** (`relationshipService.ts:118-123`): deletes by `id` only, no `family_tree_id` filter — already satisfies FR-005 (deleting removes it from every tree it was visible in) with no change needed.
- **`removeIndividualFromTree(individualId, treeId, { cascadeRelationships })`** (`treeMembershipService.ts:47-84`) and the `enforce_no_relationships_before_membership_removal` trigger it relies on (`0017_individual_tree_memberships.sql:59-78`): both key off `relationships.family_tree_id = old.family_tree_id` (the tree membership being *removed*), which already means "block removal only if a relationship was actually recorded in *this* tree" — not any other tree the pair also shares. This is exactly FR-006's required behavior (removing membership from tree 2 must not affect a relationship recorded in, and still valid in, tree 1) and needs no change.
- **`enforce_relationship_same_tree` trigger** (`0017_individual_tree_memberships.sql:82-100`): validates at *creation* time that both individuals are members of the relationship's `family_tree_id` — unrelated to display, unchanged per FR-007.
- **`getRelationshipCountForIndividual()`** (`relationshipService.ts:108-116`, used by the spec 007 admin dashboard's system-wide delete confirmation): already counts every relationship for a person across all trees, unrelated to this feature's per-tree display fix.

## §5. Downstream consumers of `TreeGraph.relationships`

`useTreeLayout`, `useExpandCollapse`, `IndividualDetailPanel`/`familyRelations.ts`, and `TreeCanvas.tsx`'s isolated-individual computation (spec 008, `src/features/tree/isolatedIndividuals.ts`) all consume whatever `graph.relationships` already contains — none of them re-filter by `family_tree_id` themselves. Once `getTreeGraph()` returns the corrected, membership-based relationship set, every downstream consumer picks up the fix automatically with no changes of its own. This also means spec 008's isolated-individual badge will correctly stop showing "Chưa có mối quan hệ" for someone whose only relationship was previously hidden by this bug, once both fixes are live together.
