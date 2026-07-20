# Quickstart: Validating Lunar Dates, Upcoming Events Calendar & Shareable Tree URLs

Validates the three user stories end-to-end against a local Supabase instance. Assumes the same local setup as `specs/001-family-tree-app/quickstart.md` (Supabase CLI running locally, `.env` populated, `npm install` done).

## Prerequisites

- Local Supabase running with this feature's migrations applied: `supabase db reset` (or `supabase migration up`) picks up `0013_family_tree_slug.sql`, `0014_event_notification_config.sql`, `0015_event_notification_log.sql` alongside 001's migrations.
- At least one existing family tree with a person who has a full-precision birth date, and one deceased person with a full-precision death date (seed data or created manually) — needed for User Story 1 and 2.
- Signed in as a user with the `admin` role for the notification-settings and slug-editing steps.
- `npm run dev` running the app locally.

## User Story 1 — Lunar dates in person detail

1. Open a person who has a full-precision birth date. **Expect**: the Gregorian birth date is shown alongside its computed lunar-calendar equivalent.
2. Open a person marked deceased with a full-precision death date. **Expect**: same pairing shown for the date of death.
3. Open a person whose birth date is year-only or unknown. **Expect**: no lunar date is shown; the view indicates it is unavailable rather than guessing (contracts/lunar-date-conversion.md).

## User Story 2 — Upcoming Events calendar & reminders

1. Click the new "Upcoming Events" item in the left sidebar. **Expect**: a month grid opens; every day shows both a Gregorian and a lunar date (contracts/events-calendar.md).
2. Navigate to the month containing the birth date used in Story 1. **Expect**: that day is highlighted.
3. Click the highlighted day. **Expect**: the detail panel lists that person and "birthday". Click a day with no matches. **Expect**: a clear "no events" message.
4. As Admin, open notification settings, enable reminders, set a template and days-before value (or accept the default 7), save. **Expect**: the settings persist on reload.
5. Optionally set a per-tree recipient override for one tree; confirm it saves independently of the global default list.
6. Manually invoke the Edge Function locally (`supabase functions invoke send-event-reminders`) with a seeded person whose event is exactly `days_before` days away. **Expect**: one row appears in `event_notification_log` for that occurrence, and no second row appears if invoked again immediately (contracts/event-notification-config.md — dedupe guarantee).

## User Story 3 — Shareable tree URLs

1. As Admin, create a new family tree named e.g. "Nguyễn Family". **Expect**: a slug like `nguyen-family` is generated automatically (contracts/tree-slug-routing.md).
2. Edit that slug to a new, valid value; confirm it saves. Attempt to set it to another existing tree's slug; **Expect**: a clear rejection, previous slug unchanged.
3. Mark the tree public but not default; visit `/<its-slug>` while signed out. **Expect**: the tree loads.
4. Mark a different tree private (not public) and not default; visit its slug URL while signed out. **Expect**: access is denied with a clear message.
5. Visit `/` (home) throughout. **Expect**: it always shows only the one tree marked default+public, unaffected by any of the above.

## Data migration check

- Confirm every pre-existing tree (created before this feature) has a non-null, unique `slug` immediately after migrations run, with no manual step required (spec FR-019, SC-006).
- Confirm no existing `individuals`/`family_trees` data (names, dates, flags) changed value as a result of the migration (spec FR-020).
