# Contract: Wide Calendar + Date-Detail Popup

## Layout (`UpcomingEvents.tsx`)

- Replaces the current `flex flex-col gap-6 sm:flex-row` two-box layout with a single container holding only `CalendarGrid`, sized so the grid is the visually dominant element (approximately 80% of the available width on screens wide enough for that to be meaningful; never less than the calendar's own minimum readable size) — spec FR-004, SC-003.
- There is no persistently-rendered `DayEventsPanel` on the page. It exists only inside the popup described below.

## Popup interaction

- Clicking any day cell in `CalendarGrid` (as today) sets the selected day; `UpcomingEvents.tsx` responds by rendering `<Modal title={<date heading>} onClose={() => setSelectedDay(null)}>` wrapping `<DayEventsPanel day=... />` — for *every* click, whether or not that day has events (spec FR-005).
- The Modal's `title` is the selected date's heading in the new inline format (see `inline-lunar-format.md`): Gregorian `DD/MM/YYYY` followed by `(<lunar> AL)`.
- `DayEventsPanel` no longer needs a "no day selected" branch — by construction it is only ever mounted while a day is selected (inside the open Modal). It keeps its existing "no events on this date" message for a day with zero matching events (spec FR-005, Edge Cases) and its existing event list otherwise.
- Closing the popup (the Modal's existing ✕ action) clears the selected day and returns to the full, unobscured calendar (spec FR-006).
- Navigating to a different month while the popup is open closes it (the selected day no longer corresponds to a visible date) rather than leaving it open showing a date from a month no longer on screen (spec Edge Cases).

## Unaffected

- `useMonthEvents`'s derivation contract (`specs/002-lunar-events-tree-slugs/contracts/events-calendar.md`) is unchanged — this contract only changes how its output is *laid out and revealed*, not how it's computed.
- `CalendarGrid`'s per-day highlight logic and its own compact lunar indicator are unchanged (see `inline-lunar-format.md` for why the grid cells specifically are out of scope for the format change).
