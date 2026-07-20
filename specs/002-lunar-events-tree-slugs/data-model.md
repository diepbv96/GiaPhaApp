# Phase 1 Data Model: Lunar Dates, Upcoming Events Calendar & Shareable Tree URLs

Entities correspond to the spec's Key Entities section. Storage: the same Supabase-hosted PostgreSQL database as 001. Types are given as Postgres types; TypeScript mirror types live in `src/types/` (implementation phase, not duplicated here). Tables/columns not listed here (`individuals`, `relationships`, `profiles`, etc.) are unchanged from `specs/001-family-tree-app/data-model.md` — this feature only adds the rows below and one new column on `family_trees`.

## Enumerations

- `life_event_type`: `birthday` | `death_anniversary` — the two recurring occurrence types this feature derives from a person's existing `birth_date`/`death_date` (spec Key Entities: Life Event).

## Computed / non-persisted concepts

These are explicitly **not** database tables — they are derived at read time from data that already exists, per spec FR-001–FR-003 and FR-008:

- **Lunar date**: computed on demand from a Gregorian `date` (only when the source date's precision is full — see `date_precision` in 001's data model) by `src/lib/lunarCalendar.ts`. Never written to the database.
- **Life Event**: for a given month/year being viewed, derived by matching each individual's `birth_date` (and, if `is_deceased`, `death_date`) month-and-day against the days in that month. Never written to the database; recomputed every time a calendar month is viewed.

## Entities

### `family_trees` (existing table, extended)

New column added to the table already described in 001's data model:

| Field | Type | Rules |
|---|---|---|
| `slug` | text, NOT NULL | **Unique** (`UNIQUE` constraint) across all trees; URL-safe (`^[a-z0-9]+(-[a-z0-9]+)*$`); auto-generated from `name` at creation time (research.md §3), editable afterward by Admin only (spec FR-014/FR-015); backfilled for every pre-existing row by migration `0013_family_tree_slug.sql` so no row is ever left without one (spec FR-019) |

**Validation / rules**:
- Generation and edits both re-validate the format and uniqueness; a colliding or malformed value is rejected before the row is written (spec FR-015, Edge Cases).
- Renaming a tree's `name` never changes an already-set `slug` (spec Edge Cases — only an explicit slug edit changes it).
- No RLS change: `slug` is readable anywhere the row itself is already readable (see 001's RLS table — any authenticated user, plus `anon` when `is_public = true`), and writable only where the row is already writable (Admin only, per the tree-creation-permission clarification).

### `event_notification_config` (new table — application-wide singleton)

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `is_singleton` | boolean, NOT NULL, default `true` | **exactly one** row may exist — enforced by a `UNIQUE` index `ON event_notification_config (is_singleton)`, the same pattern 001 uses for `family_trees.is_default` |
| `enabled` | boolean, NOT NULL, default `false` | spec FR-009; reminders are off until an Admin explicitly turns them on |
| `template` | text, NOT NULL, default `''` | spec FR-010; supports placeholders resolved at send time (person name, event type, Gregorian date, lunar date, days-until — exact placeholder syntax is an implementation detail for `/speckit-tasks`) |
| `days_before` | integer, NOT NULL, default `7`, **CHECK (days_before >= 0)** | spec FR-011 |
| `default_recipients` | text[], NOT NULL, default `'{}'` | spec FR-011a; application-wide recipient list used whenever a tree has no override row below |
| `updated_by` | uuid, FK → `profiles.id` | |
| `updated_at` | timestamptz, default `now()` | |

### `family_tree_notification_recipients` (new table — per-tree override)

| Field | Type | Rules |
|---|---|---|
| `family_tree_id` | uuid, PK, FK → `family_trees.id` | one optional override row per tree (spec FR-011b); absence of a row means "use `event_notification_config.default_recipients`" |
| `recipients` | text[], NOT NULL | overrides the global list for events belonging to this tree only |
| `updated_by` | uuid, FK → `profiles.id` | |
| `updated_at` | timestamptz, default `now()` | |

### `event_notification_log` (new table — send-once guarantee)

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | generated |
| `individual_id` | uuid, FK → `individuals.id`, NOT NULL | which person's event this reminder was for |
| `event_type` | `life_event_type`, NOT NULL | birthday vs. death anniversary |
| `event_year` | integer, NOT NULL | the Gregorian year the *upcoming* occurrence falls in (not the birth/death year) — e.g. logging the 2027 birthday reminder even though `birth_date`'s year is 1958 |
| `sent_at` | timestamptz, default `now()` | |

**Validation / rules**:
- **UNIQUE (`individual_id`, `event_type`, `event_year`)** — the Edge Function checks this before sending; a row already present means "already sent, skip" (spec FR-013).
- Written only by the reminder Edge Function (via the Supabase service-role key, which bypasses RLS by design for this trusted server-side job); no end-user-facing insert path exists.

## Relationships between entities (ER summary)

```text
family_trees 1 ──── 0/1 family_tree_notification_recipients   (optional per-tree override)
individuals  1 ──── * event_notification_log                  (one log row per sent reminder occurrence)
profiles     1 ──── * event_notification_config                (updated_by, singleton row)
profiles     1 ──── * family_tree_notification_recipients       (updated_by)
```

All other relationships (`family_trees` ↔ `individuals`, `individuals` ↔ `individuals` via `relationships`, etc.) are unchanged from 001.

## Row Level Security (authorization contract)

All new tables have RLS enabled. Policies (conceptual; exact SQL lives in `supabase/migrations/`):

| Table | `select` | `insert` / `update` / `delete` |
|---|---|---|
| `family_trees.slug` (column on existing table) | same as the row itself today — any authenticated user; plus `anon` where `is_public = true` | Admin only (unchanged tree-management policy — Clarifications: no change to who manages trees) |
| `event_notification_config` | Admin only — contains operational settings and, indirectly via `default_recipients`, other people's email addresses; never `viewer`/`editor`/`anon` | Admin only |
| `family_tree_notification_recipients` | Admin only | Admin only |
| `event_notification_log` | Admin only (for visibility into send history) | none via the client API — written exclusively by the Edge Function using the service-role key, which bypasses RLS |

This keeps the same enforcement model 001 established: the database (RLS), not the frontend, is authoritative for every access rule.
