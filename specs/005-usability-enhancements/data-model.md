# Data Model: Usability Enhancements — Delete, Sibling Order, Tree Navigation, Email Templates, Calendar Counts

One additive schema change (a new RLS policy, no new column/table); everything else reuses existing fields with no shape changes.

## Individual (existing entity, no schema change)

Source: `Individual` (`src/types/index.ts`), already fetched by existing tree/detail queries.

| Field used | Type | New usage in this feature |
|---|---|---|
| `siblingOrder` | `number \| undefined` | Now also drives left-to-right position among a unit's siblings in the tree layout (previously badge-only display, see `research.md` §2). Unchanged storage/validation (still integer ≥ 2, per `individualValidation.ts`). |
| `gender` | `"male" \| "female" \| "unknown"` | Now also selects the eldest-specific ordinal label text when `siblingOrder === 2` (previously only used for the gender chip/avatar color). |
| `id` | `string` (uuid) | Unchanged existing tie-break for equal/missing `siblingOrder` values when sorting siblings (research.md §2). |

No new fields, no validation rule changes.

## Relationship (existing entity, no schema change)

Source: `relationships` table (`supabase/migrations/0005_relationships.sql`). Unchanged shape and RLS. This feature only changes *when* rows are deleted: `deleteIndividual()` already deletes every row where the target individual is `person_a_id` or `person_b_id` before deleting the individual, when cascade is confirmed (FR-001–FR-005) — this part of the flow was already correctly implemented and needs no data-model change, only the additional cleanup below.

## Import Row Result (existing entity, one new allowed operation)

Source: `import_row_results` table (`supabase/migrations/0006_import_batches.sql`).

| Field used | Type | New usage in this feature |
|---|---|---|
| `individual_id` | `uuid \| null` | Now set to `null` by `deleteIndividual()` for every row that references the individual being deleted, unconditionally (not gated by the relationship-cascade confirmation) — this is the second, previously-unhandled foreign-key reference that made delete fail even for individuals with zero relationships (research.md §1). |

**New RLS policy required** (no new column): `import_row_results` currently has `SELECT`/`INSERT` policies only (`0007_rls_policies.sql`); an `UPDATE` policy for `admin`/`editor` is added in migration `0016_import_row_results_admin_editor_update.sql` so this nulling operation is actually permitted, mirroring the existing `relationships_admin_editor_delete` policy's role check.

**Lifecycle note**: the `import_row_results` row itself is never deleted by this feature — only its now-dangling `individual_id` pointer is cleared, preserving the parent `import_batches` row's historical counts (`succeeded_rows` etc.) as an audit trail.

## Family Tree (existing entity, no schema change)

Source: `family_trees` table / `FamilyTree` type — already has `slug` (feature 002) and is already listed with management actions in `TreeManagement.tsx`. This feature adds a `Link` to the tree's existing `/${slug}` route from the list item; no new attribute, no new route.

## Event/Notification Template (existing entity, no schema change)

Source: `event_notification_config.template` (`supabase/migrations/0014_event_notification_config.sql`), `text not null default ''`. This feature adds a client-side-only constant, `DEFAULT_EVENT_REMINDER_TEMPLATE` (see `contracts/sample-email-template.md`), used to initialize the settings panel's local textarea state when the loaded `template` value is `""`. No new column, no change to `updateConfig`'s persisted shape — see research.md §4 for why `""` is treated as "unset" without a new disambiguating field.

## Calendar Event Day (existing concept, no schema change)

`useMonthEvents.ts`'s `Map<number, LifeEvent[]>` already gives `CalendarGrid.tsx` everything needed (`events.length`) to render a count instead of a presence emoji. No new entity, no new field.
