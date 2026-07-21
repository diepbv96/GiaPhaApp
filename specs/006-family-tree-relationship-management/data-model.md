# Data Model: Family Tree Naming, Multi-Tree Membership & Relationship Management

One new table (`individual_tree_memberships`) plus two new/changed RLS policies and one rewritten trigger. `individuals`, `relationships`, and `family_trees` keep their existing column shapes — no `ALTER TABLE ... ADD COLUMN` anywhere in this feature.

## Family Tree (existing entity `family_trees`, no schema change)

Source: `supabase/migrations/0003_family_trees.sql`, `0013_family_tree_slug.sql`, `0009_public_tree_access.sql`; type `FamilyTreeSummary` (`src/types/index.ts`).

| Field | Type | Change in this feature |
|---|---|---|
| `name` | `text not null`, `check (char_length(trim(name)) > 0)` | No schema change. Now editable post-creation via `updateFamilyTreeName()` (research.md §1) — the `CHECK` constraint already backs FR-002; the `family_trees_admin_update` RLS policy already backs FR-003 (admin-only). |
| `id`, `slug`, `is_default`, `is_public` | unchanged | Not touched by this feature. |

## Individual (existing entity `individuals`, no schema change)

Source: `supabase/migrations/0004_individuals.sql`; type `Individual` (`src/types/index.ts`).

| Field | Type | Change in this feature |
|---|---|---|
| `family_tree_id` | `uuid not null references family_trees(id) on delete cascade` | **Meaning narrows**, storage unchanged: now documented as "the tree this person was originally created in," not "the tree(s) this person belongs to." Still set at `createIndividual(treeId, ...)`; a new `AFTER INSERT` trigger uses it to seed the person's first row in `individual_tree_memberships` (see below). No longer the source queried for "which trees is this person in" — `individual_tree_memberships` is. |
| all other fields | unchanged | Not touched by this feature. |

## Family Tree Membership (new entity, new table `individual_tree_memberships`)

New table, migration `0017_individual_tree_memberships.sql`.

| Field | Type | Notes |
|---|---|---|
| `individual_id` | `uuid not null references individuals(id) on delete cascade` | Part of composite primary key. |
| `family_tree_id` | `uuid not null references family_trees(id) on delete cascade` | Part of composite primary key. |
| `created_at` | `timestamptz not null default now()` | When this membership was added (original creation or a later "add to another tree" action). |

- **Primary key**: `(individual_id, family_tree_id)` — one row per (person, tree) pair; re-adding an already-current membership is rejected by the PK, which `addIndividualToTree()` maps to `DataAccessError("CONFLICT", ...)`.
- **Population rule**: every `individuals` row has at least one corresponding row here at all times (FR-004). Guaranteed two ways: (a) a new `AFTER INSERT ON individuals` trigger (`seed_individual_primary_tree_membership`) inserts `(new.id, new.family_tree_id)` automatically, so no `individuals` insert path (including bulk import) needs to change; (b) a one-time backfill statement in the same migration for every pre-existing row.
- **Last-membership guard (FR-007)**: a `BEFORE DELETE` trigger (`enforce_last_tree_membership`) raises `LAST_TREE_MEMBERSHIP: cannot remove a person's only remaining family tree` if the row being deleted is the individual's only one. `removeIndividualFromTree()` maps this to `DataAccessError("CONFLICT", "Không thể xoá: đây là cây gia phả duy nhất của cá thể này.")`.
- **Dangling-relationship guard (Edge Cases)**: a second `BEFORE DELETE` trigger (`enforce_no_relationships_before_membership_removal`) raises `MEMBERSHIP_HAS_RELATIONSHIPS: ...` if any `relationships` row in that tree still references the individual. Without this, deleting a membership row would silently leave a relationship whose `family_tree_id` no longer matches a membership for one of its endpoints — the same invariant `enforce_relationship_same_tree` protects on insert/update, but that trigger alone doesn't fire on a *membership* delete. `removeIndividualFromTree()` maps this to a `CONFLICT` asking the caller to delete those relationships first, or pass `cascadeRelationships: true` to delete them as part of the same call.
- **Isolation (FR-008)**: deleting one membership row is a single-row delete with no cascade to any other tree's data — `individuals`/`relationships` rows outside the target tree are never touched by `removeIndividualFromTree()`.
- **RLS**: `SELECT` for any authenticated user with a profile (`using (public.has_profile())`, same shape as `individuals_select` — satisfies FR-015, viewers can see membership). `INSERT`/`DELETE` for `admin`/`editor` only (same shape as `individuals_admin_editor_insert`/`_delete` — satisfies FR-005/FR-006). **No `anon` policy** — satisfies FR-017/SC-006 by Postgres's default-deny (research.md §5). No `UPDATE` policy — membership rows have no mutable column beyond the primary key itself; a "change" is a delete-then-insert (add to a different tree), never an in-place update.

## Relationship (existing entity `relationships`, no schema change; one rewritten trigger, one new RLS policy)

Source: `supabase/migrations/0005_relationships.sql`; type `Relationship` (`src/types/index.ts`).

| Field | Type | Change in this feature |
|---|---|---|
| `family_tree_id`, `type`, `person_a_id`, `person_b_id` | unchanged | No schema change. |

- **`enforce_relationship_same_tree()` trigger — rewritten** (still `before insert or update`, so it already covers the new `UPDATE` path with no trigger-definition change beyond its body): instead of comparing `individuals.family_tree_id` for both endpoints against `new.family_tree_id`, it now checks `exists (select 1 from individual_tree_memberships where individual_id = new.person_a_id and family_tree_id = new.family_tree_id)` (and the same for `person_b_id`) — this is what makes FR-013 ("prevent a relationship between two people who don't share a common family tree") hold even once a person can belong to more than one tree.
- **New RLS policy** (migration `0018_relationships_admin_editor_update.sql`): `relationships_admin_editor_update`, `for update to authenticated using (public.current_role_is(array['admin','editor']::user_role[])) with check (same)` — same shape as `relationships_admin_editor_delete`. Required because no `UPDATE` policy existed before this feature; FR-010 (update a relationship's type) is otherwise silently a no-op under RLS.
- **`relationships_unique_edge` constraint** (`unique (type, person_a_id, person_b_id)`, unchanged): already fires on `UPDATE` too, so FR-014 ("prevent duplicate relationships") continues to hold for the new update path with no constraint change — `updateRelationship()` maps its `23505` the same way `createRelationship()` does.

## Row Level Security summary (this feature's additions only)

| Table | Policy | Roles | Operation |
|---|---|---|---|
| `individual_tree_memberships` | `individual_tree_memberships_select` | any authenticated (has profile) | `SELECT` |
| `individual_tree_memberships` | `individual_tree_memberships_admin_editor_insert` | admin, editor | `INSERT` |
| `individual_tree_memberships` | `individual_tree_memberships_admin_editor_delete` | admin, editor | `DELETE` |
| `relationships` | `relationships_admin_editor_update` | admin, editor | `UPDATE` |

(`family_trees_admin_update`, used for the rename feature, already exists — no new policy needed there.)
