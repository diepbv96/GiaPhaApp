# Quickstart: Validating Events, Calendar & Navigation UI Refinements

Validates all four user stories against the already-running local setup from 001/002 (Supabase CLI running locally, `.env` populated, `npm run dev`). No new migrations to apply — this feature changes no schema.

## Prerequisites

- At least two family trees: the existing default+public seed tree, and one additional, non-default tree with its own slug (create one via "Quản lý cây gia phả" if you don't already have a second from validating 002).
- The second tree should have at least one person with a full-precision birth date, ideally one whose lunar equivalent falls in a leap month (for the leap-qualifier check).
- Signed in as `admin` for the management-parity checks; also check as `viewer`/signed-out for the read-only checks.

## User Story 1 — Full navigation and management via slug URL

1. As Admin, open the second tree's slug URL directly. **Expect**: the same sidebar as the home screen — viewing options, export, "Sự kiện sắp tới," and (as Admin) the "Quản lý cá thể" section and the global "Tài khoản" links.
2. From that sidebar, add a new individual, then edit and delete them. **Expect**: works identically to doing the same on the home screen's default tree (contracts/tree-workspace-navigation.md).
3. Sign in as `editor` (or `viewer`) and repeat step 1. **Expect**: `editor` sees the same management section as Admin; `viewer` sees only the read-only viewing options, no management controls (spec FR-002a).
4. From the second tree's sidebar, click "Sự kiện sắp tới." **Expect**: the calendar shows that tree's own people, not the default tree's (spec FR-001, SC-002). Confirm the URL is `/<slug>/su-kien-sap-toi`.
5. From the home screen's sidebar, click "Sự kiện sắp tới." **Expect**: unchanged — still shows the default tree's events at `/su-kien-sap-toi`.
6. Sign out and open the second tree's slug URL (only if it's marked public). **Expect**: same sidebar, read-only, same guest-visibility rule as before.

## User Story 2 — Wide calendar with popup

1. Open "Sự kiện sắp tới" for any tree. **Expect**: the calendar grid is the dominant element on screen; no separate, always-visible event-detail box next to it (contracts/calendar-popup-layout.md).
2. Click a highlighted day. **Expect**: a popup opens listing that day's events.
3. Click a non-highlighted day. **Expect**: the same popup opens with a clear "no events on this date" message.
4. Close the popup. **Expect**: returns to the full, unobscured calendar.
5. Open the popup, then navigate to the next/previous month. **Expect**: the popup closes rather than showing a stale date.

## User Story 3 — Inline lunar format

1. Open the person with a fully-known birth date from Prerequisites. **Expect**: the birth date reads as `<Gregorian DD/MM/YYYY> (<lunar DD/MM/YYYY> AL)` on one line (contracts/inline-lunar-format.md).
2. If you have a person whose lunar birth/death date falls in a leap month, check their detail view. **Expect**: the inline value includes `(nhuận)`.
3. Open a person with only a year-known or unknown birth date. **Expect**: the existing "unavailable" indication, no malformed `AL` value.
4. Open the events popup for a date with a match. **Expect**: its heading also uses the same inline format.
5. Check the calendar grid's own day cells. **Expect**: unchanged compact `d/m` indicator — this format change intentionally does not apply there.

## User Story 4 — Copy updates

1. Load the app fresh (before any tree loads, e.g. the browser tab). **Expect**: title reads "Gia Phả App." Check the sign-in screen heading too.
2. Open any tree's sidebar. **Expect**: the toggle reads "Ẩn dâu/rễ" and still hides/shows in-law relatives when toggled.
3. Once a tree has loaded, check the sidebar's title. **Expect**: it shows that specific tree's own name (e.g. "Gia Phả Dòng Họ Bùi (Mẫu)" for the seed tree) — unchanged, since this rename only touches the app's generic label, never a tree's own name.

## Regression check

- Confirm the home screen's behavior for a guest on a non-public default tree, and for an authenticated user with no default tree set, is unchanged from before this feature (contracts/tree-workspace-navigation.md).
- Confirm no `individuals`/`relationships`/`family_trees` data changed as a side effect of this refactor (spec is UI-only; no migration exists to run).
