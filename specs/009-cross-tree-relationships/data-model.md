# Data Model: Cross-Tree Relationship Visibility

One migration, no new tables, no schema/column changes. `0023_relationship_cross_tree_visibility.sql`: rewrites one existing RLS policy (`relationships_public_select`) to key off membership instead of the relationship's own `family_tree_id`. Everything else in this feature is a query-shape change in the application layer (`getTreeGraph()`), not a data-model change.

## Relationship (existing entity `relationships`, no schema change)

Source: `supabase/migrations/0005_relationships.sql`; type `Relationship` (`src/types/index.ts`). Unchanged: columns, `relationships_unique_edge unique (type, person_a_id, person_b_id)`, `enforce_relationship_same_tree` creation-time trigger.

This feature does not add a "which trees is this relationship visible in" column or join table. A relationship's visibility in a given tree is *computed*, not stored: it is visible in tree T if and only if both `person_a_id` and `person_b_id` currently have an `individual_tree_memberships` row for T — exactly mirroring how an individual's own visibility in T is already computed (spec 006). `relationships.family_tree_id` remains on the row as "the tree this relationship was originally recorded in" — meaningful for history/audit, not for display (research.md §1).

## Individual–Family Tree Membership (existing entity `individual_tree_memberships`, no change)

Source: `supabase/migrations/0017_individual_tree_memberships.sql`. No column, index, trigger, or RLS change — this feature *reads* this table (both from the application query and from the rewritten RLS policy below) but does not modify it. `enforce_no_relationships_before_membership_removal` and `enforce_last_tree_membership` continue to behave exactly as before (research.md §4).

## Row Level Security change

| Table | Policy | Change |
|---|---|---|
| `relationships` | `relationships_select` (authenticated) | None — already `using (public.has_profile())`, tree-scoping is entirely client-side for authenticated users (research.md §3). |
| `relationships` | `relationships_public_select` (anon) | **Rewritten.** Old: `exists (select 1 from family_trees where family_trees.id = relationships.family_tree_id and family_trees.is_public)`. New: `exists (select 1 from individual_tree_memberships a join individual_tree_memberships b on a.family_tree_id = b.family_tree_id join family_trees ft on ft.id = a.family_tree_id where a.individual_id = relationships.person_a_id and b.individual_id = relationships.person_b_id and ft.is_public)` — visible to a guest whenever there exists *some* public tree where both endpoints are members, mirroring the join shape `individual_tree_memberships_public_select` already uses (`0019_public_tree_membership_visibility.sql`). |

No other RLS policy changes. No new policies.

## Application-layer contract change

`getTreeGraph(treeId)` (`src/features/tree/treeGraphService.ts`) changes from one parallel pair of queries to two sequential queries — see `contracts/tree-graph-relationship-visibility.md` for the exact before/after shape.
