# Research: Usability Enhancements — Delete, Sibling Order, Tree Navigation, Email Templates, Calendar Counts

## 1. Why delete still fails even though a cascade-confirm dialog already exists

**Finding**: `DeleteIndividualDialog` (`src/features/individuals/DeleteIndividualDialog.tsx`) *is* already wired up — `TreeWorkspace.tsx:207-220` opens it via the "Xoá cá thể" button, and `relationshipCount` (`TreeWorkspace.tsx:66-70`) is computed correctly from `graph.relationships`. `deleteIndividual()` (`individualService.ts:73-96`) already deletes matching `relationships` rows first when `cascadeRelationships: true`, then deletes the individual. Read in isolation, this looks complete — which means the reported failure has a different root cause.

**Root cause**: `import_row_results.individual_id` (`supabase/migrations/0006_import_batches.sql:20`) references `public.individuals(id)` with **no `on delete` clause** — Postgres defaults that to `NO ACTION`, which raises the exact same `23503` foreign-key-violation code as `relationships`' `on delete restrict`. `deleteIndividual()` only clears `relationships` before deleting; it never touches `import_row_results`. So **any individual that was ever created via a bulk `.xlsx` import** (`src/features/import/xlsxParser.ts`) still fails to delete — with the same misleading "vẫn còn mối quan hệ" message — even after the relationship-cascade checkbox is confirmed, and even if that individual has *zero* relationships (which would currently violate spec FR-001: delete-with-no-relationships must need no extra confirmation, but today it can still throw).

**Decision**: `deleteIndividual()` MUST also clear the reference in `import_row_results` — by setting `individual_id` to `null` (not deleting the row), since `import_row_results` is import-history bookkeeping the app already treats as independently readable (`import_row_results_select` RLS policy) and there is no reason to destroy that audit trail just because the person it once pointed to was deleted. This runs unconditionally (not gated behind `cascadeRelationships`), because the bug reproduces even with zero relationships.

**Blocking prerequisite**: `import_row_results` has `SELECT` and `INSERT` RLS policies only (`supabase/migrations/0007_rls_policies.sql:101-107`) — no `UPDATE` policy exists, so a client-side `.update({ individual_id: null })` would silently affect 0 rows under RLS. A new migration (`0016_import_row_results_admin_editor_update.sql`) adds an `UPDATE` policy for `admin`/`editor`, mirroring the existing `relationships_admin_editor_delete` policy's `current_role_is(...)` check (`0007_rls_policies.sql:88-90`).

**Alternatives considered**:
- Deleting the `import_row_results` rows outright instead of nulling `individual_id`: rejected — destroys the import-run's row-count/audit history (`succeeded_rows` etc. on the parent `import_batches` row would no longer be explainable) for no benefit.
- A Postgres trigger (`SECURITY DEFINER`) to null the reference automatically on individual delete, avoiding a new RLS policy: rejected as more complex than a one-line RLS policy addition that follows an existing, understood pattern in this codebase (real triggers here are reserved for `updated_at` bookkeeping, not FK cleanup).

## 2. Sibling ordering in the tree layout

**Finding**: `useTreeLayout.ts` groups individuals into "conjugal units" (couples) and lays out a **unit tree** with `d3-hierarchy`. Left-to-right order of a parent unit's child units is currently `.sort()` on the **unit id string** (`useTreeLayout.ts:139`), with root-level units similarly `.sort()`ed at `useTreeLayout.ts:148`. Neither uses `Individual.siblingOrder` (added in feature-agnostic migration `0012`) at all — it's captured and shown as a badge (`IndividualNode.tsx:40-47`) but never affects position, which is exactly the bug the spec describes.

**Decision**: Change only the parent→child sort at `useTreeLayout.ts:139` (root-level `unitRoots.sort()` at line 148 is left unchanged — see Alternatives). For each unit, resolve its **blood member relative to that specific parent** — the same member found by the existing step-3 loop (`useTreeLayout.ts:112-122`, `for (const memberId of [...members].sort()) { if (primaryParentOf.get(memberId) is in the parent unit) ... }`) — and use that member's `Individual.siblingOrder`. Build a `Map<unitId, number | undefined>` once (`unitSiblingOrderOf`) during that same step-3 pass, then sort each parent's children with:

```
(a, b) =>
  (unitSiblingOrderOf.get(a) ?? Infinity) - (unitSiblingOrderOf.get(b) ?? Infinity)
  || (a < b ? -1 : a > b ? 1 : 0)   // existing id tie-break, unchanged
```

This satisfies FR-006/FR-007: ascending numeric order first, id-string order as the existing stable tie-break for equal/missing values (both "two siblings share a position" and "neither has one" edge cases from spec.md fall out of the `?? Infinity` + tie-break for free, with no new validation).

**Alternatives considered**:
- Also reordering `unitRoots` (line 148) by `siblingOrder`: rejected — root-level units by construction share **no** recorded parent, so "siblings" doesn't apply to them the way the spec describes ("giữa các anh chị em" = among children of the same parent); any shared `siblingOrder` value between two unrelated root units would be coincidental, not a birth-order relationship. Left as today's existing (documented) ordering, consistent with the file's existing "known layout limitation" comment style for edges outside strict parent/child grouping.
- Deriving `siblingOrder` from birth date instead: rejected — the field's own DB comment (`0012_individual_sibling_order.sql`) explicitly says it is "deliberately NOT derived from birth_date," and the spec's Assumptions section confirms this feature doesn't change that convention.

## 3. Eldest-child label (position 2)

**Finding**: `siblingOrderLabel(order?: number)` (`src/lib/formatters.ts:11-14`) returns `"Con thứ {order}"` for any defined order, or `"Chưa rõ / con một"` when unset — confirmed by its own doc comment as implementing the "eldest is 'thứ 2', no 'thứ Nhất'" convention. It has exactly two call sites: `IndividualDetailPanel.tsx:123` and `IndividualForm.tsx:114` (a live preview of the label while entering the order number). `IndividualNode.tsx:40-47`'s tree-badge tooltip does **not** call this function — it inlines its own hardcoded Vietnamese string (`` `Thứ ${individual.siblingOrder} trong các anh/chị/em` ``), so today's badge tooltip and the detail-panel chip can already say different things for the same value; this feature is the natural point to unify them.

**Decision**: Change the function signature to `siblingOrderLabel(order: number | undefined, gender: Gender): string`, adding the `order === 2` branch per FR-008/FR-009/FR-010:

```ts
export function siblingOrderLabel(order: number | undefined, gender: Gender): string {
  if (order === undefined) return "Chưa rõ / con một";
  if (order === 2) {
    if (gender === "male") return "Con Trai Trưởng";
    if (gender === "female") return "Con Gái Trưởng";
    return "Con Trưởng";
  }
  return `Con thứ ${order}`;
}
```

Update both existing call sites to pass `individual.gender` (detail panel) / the form's current `gender` field value (form preview), and additionally change `IndividualNode.tsx`'s badge tooltip to call this same function with `individual.gender` instead of its own hardcoded string — this is a pure bug-for-bug consistency fix, not a new requirement, and keeps every surface (FR-013) in agreement by construction instead of by convention.

**Alternatives considered**:
- Leaving `IndividualNode.tsx`'s inline string untouched and only changing the two existing call sites: rejected — would violate FR-013 (labeling must be consistent everywhere it's shown today) and leave the tree-node tooltip still saying "Thứ 2" for someone the detail panel now calls "Con Trai Trưởng."

## 4. Email template sample default

**Finding**: `event_notification_config.template` (`supabase/migrations/0014_event_notification_config.sql:9`) is `text not null default ''`, and the singleton config row is seeded with only `id` — so `template` starts as `''`. `NotificationSettingsPanel.tsx:37` initializes its local `template` state directly from the loaded config (`useState(config.template)`), and the textarea (lines 93-100) always renders exactly that value. There is **no way today to tell "never configured" apart from "admin cleared it back to empty on purpose"** — both are `''`.

**Decision**: Treat `config.template === ""` as "no template yet" purely client-side — when `NotificationSettingsPanel` initializes its `template` state and the loaded value is `""`, initialize with a new exported constant `DEFAULT_EVENT_REMINDER_TEMPLATE` (see `contracts/sample-email-template.md`) instead of the empty string. No migration, no schema/default change: the moment the admin saves (unchanged or edited), `updateConfig` persists real text, so `config.template` is never `""` again for that config row afterward, and this rule naturally stops applying (FR-020). If an admin very deliberately edits the field back to blank and saves, the *next* load will show the sample again — an acceptable, spec-consistent behavior (the spec only distinguishes "template previously saved" in the sense of "admin has customized wording," and blank isn't a customized wording state worth preserving as blank).

**Alternatives considered**:
- A `has_custom_template boolean` column to disambiguate "empty on purpose" from "never set": rejected — no requirement in the spec asks for that distinction to survive a deliberate clear-and-save-blank action, and it would be a schema change for a case the spec's own Assumptions section explicitly doesn't require ("no additional selectable templates... required").
- Seeding the DB migration's default row with the sample text directly (`default '<sample text>'`): rejected — makes the sample indistinguishable from a real saved value from day one (an admin could no longer tell "I haven't touched this" from "I saved the sample on purpose," though behaviorally this rarely matters), and would require a data migration to backfill the existing already-seeded singleton row, versus a zero-migration client-side default.

## 5. Everything else — no new unknowns

- **"Xem chi tiết" tree-list CTA**: `TreeManagement.tsx` already imports `Link` from `react-router-dom` (used elsewhere on the page) and the target route `/:slug` → `TreeBySlug` already exists (`src/app/router.tsx`). This is a same-pattern addition next to the existing "Sửa slug" button — no research unknowns.
- **Calendar event count**: `CalendarGrid.tsx`'s day-cell render already has `events.length` in scope at the exact line (95) that currently renders the 🎉 emoji; `useMonthEvents.ts`'s `Map<number, LifeEvent[]>` and `DayEventsPanel.tsx` need no changes. No research unknowns.
