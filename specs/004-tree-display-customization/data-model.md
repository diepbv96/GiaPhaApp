# Data Model: Tree Display Customization

No database schema changes. This feature introduces no new Supabase tables, columns, or RLS policies — everything below is either (a) derived styling from fields that already exist on `Individual`, or (b) client-local `sessionStorage` state that never reaches the server.

## Person Card (existing entity, restyled — no schema change)

Source: `Individual` (`src/types/index.ts`), already fetched by existing tree queries.

| Field used | Type | New usage in this feature |
|---|---|---|
| `isDeceased` | `boolean` | Selects the card's border + background color pair (living vs. deceased treatment). Was previously not reflected in card styling at all. |
| `gender` | `"male" \| "female" \| "unknown"` | Selects the avatar's border color. Previously selected the *card's* top border color instead. |

No new fields, no validation rule changes — both signals are already required/typed on `Individual` today.

## Background Color Preference (new, client-local only — not a database entity)

Held entirely in the browser's `sessionStorage` (never sent to Supabase, never associated with a user row). See `contracts/background-color-preference.md` for the exact key shape and resolution algorithm.

| Conceptual field | Type | Notes |
|---|---|---|
| `scope` | `"tree" \| "all-trees"` | Which sessionStorage key family the value lives under. |
| `treeId` | `string` (only when `scope: "tree"`) | The family tree's existing `id` (`FamilyTree.id`) — no new identifier is introduced. |
| `colorHex` | `string`, always `#rrggbb` | Produced directly by `<input type="color">`; no format validation needed beyond what the browser control already guarantees. |

**Lifecycle**: created when the visitor clicks a "save" action; read on every render of a tree's canvas to resolve the effective color; removed by the corresponding "reset" action; implicitly discarded in full when the browser session ends (native `sessionStorage` behavior — no explicit expiry logic needed).

**No relationships**: this preference is looked up by `treeId` string match only; it does not join against, reference, or get invalidated by any other entity (e.g. deleting a family tree does not need to clean up its orphaned sessionStorage key — it is harmless, per-origin, session-scoped, and bounded by however many trees one visitor opens in one browser session).
