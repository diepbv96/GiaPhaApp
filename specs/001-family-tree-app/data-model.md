# Phase 1 Data Model: Bùi Family Genealogy Tree (Gia Phả)

Entities correspond to the spec's Key Entities section. Storage: Supabase-hosted PostgreSQL. Types are given as Postgres types; the TypeScript mirror types live in `src/types/` (Phase 2/implementation, not duplicated here).

## Enumerations

- `person_gender`: `male` | `female` | `unknown` (spec Assumptions: small fixed set, no free text)
- `date_precision`: `day` | `month` | `year` | `unknown` (supports FR-006 partial/unknown dates)
- `relationship_type`: `parent_child` | `spouse` | `sibling` (FR-002)
- `user_role`: `admin` | `editor` | `viewer` (FR-009)
- `import_row_status`: `succeeded` | `failed` | `duplicate` (FR-014, FR-025)

## Entities

### `family_trees`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `name` | text, NOT NULL | non-empty |
| `is_default` | boolean, NOT NULL, default `false` | **at most one** row may have `is_default = true` — enforced by a partial unique index `ON family_trees (is_default) WHERE is_default`; FR-018 |
| `is_public` | boolean, NOT NULL, default `false` | when `true`, unauthenticated guests may `select` this tree and its individuals/relationships (FR-028); toggled only by Admin |
| `created_by` | uuid, FK → `profiles.id` | |
| `created_at` | timestamptz, default `now()` | |

**Validation / rules**:
- FR-016/FR-017: a `BEFORE INSERT` trigger rejects the insert if `count(*) >= 5` (system-wide, not per-user — spec Assumptions).
- FR-021: application logic (not a DB constraint, since it depends on "is this the last one" / "is this the default") blocks deleting the last remaining tree, and blocks deleting the tree currently marked default until another tree is explicitly marked default first.
- FR-028/FR-029: `is_public` only ever affects `select` (read) access for the `anon` role — no `insert`/`update`/`delete` policy is ever granted to `anon`, on this table or any other, regardless of this flag.

### `profiles`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK, FK → `auth.users.id` | 1:1 with Supabase Auth user |
| `display_name` | text | |
| `role` | `user_role`, NOT NULL, default `viewer` | FR-009; only an existing admin can change another profile's role (RLS, see below) |
| `created_at` | timestamptz, default `now()` | |

### `individuals`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `family_tree_id` | uuid, FK → `family_trees.id`, NOT NULL | an individual belongs to exactly one tree (Key Entities) |
| `full_name` | text, NOT NULL | required, FR-005 |
| `alias` | text, NULL | optional, "Bí Danh" |
| `gender` | `person_gender`, NOT NULL | required, FR-005 |
| `birth_date` | date, NULL | optional, partial dates stored via `birth_date_precision` (e.g., year-only stored as Jan 1 of that year + precision `year`) |
| `birth_date_precision` | `date_precision`, NULL | FR-006 |
| `is_deceased` | boolean, NOT NULL, default `false` | explicit living/deceased flag; the UI hides "Ngày mất" whenever this is `false`, instead of inferring life status from an empty `death_date` (an empty date means "unknown date", not "still alive") |
| `death_date` | date, NULL | optional; only meaningful when `is_deceased = true` |
| `death_date_precision` | `date_precision`, NULL | FR-006 |
| `notes` | varchar(100), NULL | **CHECK (char_length(notes) <= 100)** — DB-enforced backstop for FR-007, in addition to client-side validation |
| `avatar_path` | text, NULL | Supabase Storage object path in the `avatars` bucket; at most one path stored → at-most-one-avatar (FR-008) is a natural consequence of the single-column model; uploading a new photo overwrites this path (and the stored object) |
| `layout_x` / `layout_y` | double precision, NULL | manual node position set by an Admin/Editor dragging a node in the tree canvas; `NULL` means "use the computed generational layout" |
| `sibling_order` | integer, NULL | manually entered ordinal among siblings, per the Vietnamese naming convention (eldest = 2, then 3, 4, ...); not derived from `birth_date` — many recorded individuals have no birth date, and a family's traditional ordinal doesn't always match it exactly even when one exists |
| `created_by` / `updated_by` | uuid, FK → `profiles.id` | |
| `created_at` / `updated_at` | timestamptz | |

### `relationships`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `family_tree_id` | uuid, FK → `family_trees.id`, NOT NULL | denormalized from both endpoints for RLS scoping/query performance; must match both individuals' `family_tree_id` (checked at write time) |
| `type` | `relationship_type`, NOT NULL | FR-002 |
| `person_a_id` | uuid, FK → `individuals.id`, NOT NULL | for `parent_child`: the parent; for `spouse`/`sibling`: either side (undirected) |
| `person_b_id` | uuid, FK → `individuals.id`, NOT NULL | for `parent_child`: the child; for `spouse`/`sibling`: the other side |
| `created_at` | timestamptz | |

**Validation / rules**:
- `person_a_id <> person_b_id` (CHECK) — an individual cannot have a relationship with themselves.
- Unique constraint on `(type, person_a_id, person_b_id)` to prevent exact duplicate edges; application logic also treats `(type, person_b_id, person_a_id)` as a duplicate for the undirected types (`spouse`, `sibling`) before insert.
- FR-012: deleting an individual who is referenced by any `relationships` row is blocked by the application layer unless the user explicitly confirms cascading removal of those relationship rows first (implemented as an explicit two-step delete, not an `ON DELETE CASCADE`, so the "explicit confirmation" UX in FR-012 is always honored).
- An individual may appear in any number of relationship rows (multiple children, multiple spouses over time) — no cardinality limit (spec Assumptions).

### `import_batches`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `family_tree_id` | uuid, FK → `family_trees.id`, NOT NULL | |
| `uploaded_by` | uuid, FK → `profiles.id`, NOT NULL | |
| `file_name` | text | |
| `total_rows` / `succeeded_rows` / `failed_rows` / `duplicate_rows` | integer | summary counts shown per FR-014/US3 acceptance scenario 4 |
| `created_at` | timestamptz | |

### `import_row_results`

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `import_batch_id` | uuid, FK → `import_batches.id`, NOT NULL | |
| `row_number` | integer, NOT NULL | 1-based row number in the source spreadsheet, for user-facing error reporting |
| `status` | `import_row_status`, NOT NULL | FR-014/FR-025 |
| `error_message` | text, NULL | populated when `status = 'failed'` |
| `individual_id` | uuid, FK → `individuals.id`, NULL | populated when `status = 'succeeded'` |

## Relationships between entities (ER summary)

```text
family_trees 1 ──── * individuals
family_trees 1 ──── * relationships   (denormalized for scoping)
individuals   * ──── * individuals    (via relationships: person_a_id / person_b_id)
family_trees 1 ──── * import_batches
import_batches 1 ──── * import_row_results
profiles 1 ──── * individuals         (created_by / updated_by)
profiles 1 ──── * import_batches      (uploaded_by)
```

## Row Level Security (authorization contract)

All tables have RLS enabled. Policies (conceptual; exact SQL lives in `supabase/migrations/`):

| Table | `select` | `insert` / `update` / `delete` |
|---|---|---|
| `individuals`, `relationships` | any authenticated user with a `profiles` row (any role) — FR-024; **plus** `anon` (unauthenticated guests) where the row's `family_tree_id` belongs to a tree with `is_public = true` — FR-028 | `profiles.role IN ('admin','editor')`; never `anon` — FR-010, FR-011, FR-029 |
| `family_trees` | any authenticated user with a `profiles` row; **plus** `anon` where `is_public = true` — FR-028 | `profiles.role = 'admin'`; never `anon` — FR-020, FR-029 |
| `import_batches`, `import_row_results` | any authenticated user with a `profiles` row | insert: `profiles.role IN ('admin','editor')`; never `anon` |
| `profiles` | a user can read their own row; admins can read all | a user can update their own `display_name`; only `admin` can change `role` |
| `storage.objects` (`avatars` bucket) | bucket is public — readable by anyone (including `anon`) who has an object's path, per FR-028's guest photo viewing; paths are not listable/enumerable | `profiles.role IN ('admin','editor')`; never `anon` |

This is the enforcement layer referenced in `research.md` §3 — the frontend additionally hides/disables controls per role (and hides all management UI entirely for guests), but RLS is authoritative. Guests never get any `insert`/`update`/`delete` policy on any table, on any tree, regardless of `is_public` (FR-029) — publishing a tree only ever grants additional `select` access.
