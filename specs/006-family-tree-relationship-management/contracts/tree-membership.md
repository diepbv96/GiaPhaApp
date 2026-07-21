# Contract: Multi-tree membership

**Modules**: `supabase/migrations/0017_individual_tree_memberships.sql`, `src/features/individuals/treeMembershipService.ts`, `src/features/tree/treeGraphService.ts`, `src/features/individuals/ManageTreeMembershipDialog.tsx`

## Migration `0017_individual_tree_memberships.sql`

```sql
create table public.individual_tree_memberships (
  individual_id uuid not null references public.individuals (id) on delete cascade,
  family_tree_id uuid not null references public.family_trees (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (individual_id, family_tree_id)
);

create index individual_tree_memberships_tree_idx on public.individual_tree_memberships (family_tree_id);

-- Seed every existing individual's current tree as their first membership.
insert into public.individual_tree_memberships (individual_id, family_tree_id, created_at)
select id, family_tree_id, created_at from public.individuals;

-- Every future individuals insert auto-seeds its own membership row — no other
-- insert path (including bulk import) needs to change.
create function public.seed_individual_primary_tree_membership()
returns trigger language plpgsql as $$
begin
  insert into public.individual_tree_memberships (individual_id, family_tree_id)
  values (new.id, new.family_tree_id);
  return new;
end;
$$;

create trigger individuals_seed_tree_membership
  after insert on public.individuals
  for each row execute function public.seed_individual_primary_tree_membership();

-- FR-007: never let a person end up with zero family trees.
create function public.enforce_last_tree_membership()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.individual_tree_memberships where individual_id = old.individual_id) <= 1 then
    raise exception 'LAST_TREE_MEMBERSHIP: cannot remove a person''s only remaining family tree'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger individual_tree_memberships_last_check
  before delete on public.individual_tree_memberships
  for each row execute function public.enforce_last_tree_membership();

-- Edge Cases: block removing a membership while relationships in that tree still
-- reference this person — otherwise the delete would silently leave a dangling
-- relationship (same invariant enforce_relationship_same_tree protects on
-- insert/update, which doesn't fire on a membership delete).
create function public.enforce_no_relationships_before_membership_removal()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.relationships
    where family_tree_id = old.family_tree_id
      and (person_a_id = old.individual_id or person_b_id = old.individual_id)
  ) then
    raise exception 'MEMBERSHIP_HAS_RELATIONSHIPS: cannot remove a tree membership while relationships in that tree still reference this person'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger individual_tree_memberships_relationship_check
  before delete on public.individual_tree_memberships
  for each row execute function public.enforce_no_relationships_before_membership_removal();

-- FR-013: rewritten to check membership instead of individuals.family_tree_id.
create or replace function public.enforce_relationship_same_tree()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.individual_tree_memberships
    where individual_id = new.person_a_id and family_tree_id = new.family_tree_id
  ) or not exists (
    select 1 from public.individual_tree_memberships
    where individual_id = new.person_b_id and family_tree_id = new.family_tree_id
  ) then
    raise exception 'RELATIONSHIP_TREE_MISMATCH: both individuals must belong to the relationship''s family tree'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

alter table public.individual_tree_memberships enable row level security;

create policy individual_tree_memberships_select on public.individual_tree_memberships
  for select using (public.has_profile());

create policy individual_tree_memberships_admin_editor_insert on public.individual_tree_memberships
  for insert to authenticated
  with check (public.current_role_is(array['admin', 'editor']::user_role[]));

create policy individual_tree_memberships_admin_editor_delete on public.individual_tree_memberships
  for delete to authenticated
  using (public.current_role_is(array['admin', 'editor']::user_role[]));

-- Deliberately no `anon` policy: default-deny keeps other-tree membership
-- invisible to public/guest viewers (FR-017, SC-006).
```

## `treeGraphService.ts` — `getTreeGraph()` (modified)

Individuals query changes from:

```ts
supabase.from("individuals").select(INDIVIDUAL_COLUMNS).eq("family_tree_id", treeId)
```

to:

```ts
supabase
  .from("individuals")
  .select(`${INDIVIDUAL_COLUMNS}, individual_tree_memberships!inner(family_tree_id)`)
  .eq("individual_tree_memberships.family_tree_id", treeId)
```

The relationships query is unchanged (`relationships.family_tree_id` is still the direct, correct scope for "which relationships belong to this tree" — relationships aren't multi-tree, only people are). `mapIndividualRow` is unchanged — it never reads the embedded `individual_tree_memberships` field, so the extra joined data is simply ignored during mapping.

## `treeMembershipService.ts` (new)

```ts
export async function getIndividualTreeMemberships(individualId: string): Promise<FamilyTreeSummary[]>
export async function addIndividualToTree(individualId: string, treeId: string): Promise<void>
export async function removeIndividualFromTree(
  individualId: string,
  treeId: string,
  opts?: { cascadeRelationships?: boolean },
): Promise<void>
```

- `getIndividualTreeMemberships`: joins `individual_tree_memberships` → `family_trees` for the given `individualId`, mapped through `mapFamilyTreeRow`. Used both to render "current memberships" and, combined with `getFamilyTrees()`, to compute the "not yet a member of" candidate list for the add-to dialog.
- `addIndividualToTree`: `insert({ individual_id: individualId, family_tree_id: treeId })` into `individual_tree_memberships`. Error mapping: `23505` (already a member — the composite PK) → `DataAccessError("CONFLICT", "Cá thể này đã là thành viên của cây gia phả này.")`; `42501` → `PERMISSION_DENIED`.
- `removeIndividualFromTree`: if `opts?.cascadeRelationships`, first deletes every `relationships` row in `treeId` where the individual is `person_a_id` or `person_b_id` (same shape as `deleteIndividual`'s existing cascade step), then deletes the `individual_tree_memberships` row for `(individualId, treeId)`. Error mapping: the trigger's `LAST_TREE_MEMBERSHIP` message (matched via `error.message.includes(...)`, same pattern `createFamilyTree` uses for `FAMILY_TREE_LIMIT_REACHED`) → `DataAccessError("CONFLICT", "Không thể xoá: đây là cây gia phả duy nhất của cá thể này.")`; Postgres `23503` (relationships still reference this person in this tree, cascade not confirmed) → `DataAccessError("CONFLICT", "Cá thể này vẫn còn mối quan hệ trong cây gia phả này. Hãy xoá mối quan hệ trước hoặc xác nhận xoá cả mối quan hệ.")` — same two-step confirm pattern as `contracts/delete-individual.md` (feature 005).

## `ManageTreeMembershipDialog` component contract

Props: `{ individual: Individual; onClose: () => void }`.

- Loads `getIndividualTreeMemberships(individual.id)` and `getFamilyTrees()`; "add to" list = all trees minus current memberships.
- Each current-membership row shows a "Xoá khỏi cây này" button, disabled (with a tooltip explaining why) when it's the individual's only membership — a client-side UX shortcut for FR-007, with the DB trigger as the real backstop if bypassed.
- Selecting a tree from the "add to" list calls `addIndividualToTree`; removing calls `removeIndividualFromTree` (prompting for cascade confirmation first if that tree has relationships for this person, reusing the same confirm-checkbox pattern as `DeleteIndividualDialog`).
- On any successful mutation: invalidate `["tree-graph"]` (all trees, since the person now appears/disappears from one) and re-fetch the dialog's own membership list.

## Preconditions

- `admin`/`editor` role for `addIndividualToTree`/`removeIndividualFromTree` (RLS-enforced, migration above). Any authenticated role for `getIndividualTreeMemberships` (viewers can see, not change — FR-015).

## Non-goals

- No cross-tree person search UI — "add to another tree" always starts from an already-selected individual (research.md §3).
- Does not change how `individualService.createIndividual`/bulk import assign a person's *first* tree — that's still `family_tree_id` on insert, auto-seeding the membership table via the new trigger.
