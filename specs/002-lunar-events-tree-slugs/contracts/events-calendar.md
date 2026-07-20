# Contract: Upcoming Events Calendar

## Data derivation (`src/features/events/useMonthEvents.ts`)

```text
useMonthEvents(individuals: Individual[], month: number): Map<dayOfMonth, LifeEvent[]>
```

- **Input**: the already-fetched list of individuals for the currently-open family tree (spec Clarifications: events reflect the tree currently being viewed — no cross-tree aggregation), plus the calendar month the user is browsing. No `year` parameter: matching is month-and-day only (FR-008), so the result never actually varies by year — the calendar UI still tracks a year for navigation and for rendering each day's lunar equivalent, just not as an input to this derivation.
- **Behavior**: for each individual, if `birth_date` has full precision and its month matches the requested `month`, emit a `{ type: 'birthday', individual, day: birth_date.day }` entry for that day; if `is_deceased` and `death_date` has full precision and its month matches, emit a `{ type: 'death_anniversary', individual, day: death_date.day }` entry. Matching is by month-and-day only — the year of `birth_date`/`death_date` is irrelevant, because the event recurs every year (spec FR-008).
- **Output**: a map from day-of-month to the (possibly empty) list of matching Life Events for that day. A day with an empty list is exactly the "no events" case (spec FR-007, acceptance scenario 4) — it is not a distinct state to compute separately, just an empty result.

## UI contract (`CalendarGrid.tsx` + `DayEventsPanel.tsx`)

- Every rendered day cell shows: its Gregorian day number, and its lunar day/month (via the lunar-date-conversion contract) — always both, regardless of whether the day has events (spec FR-005).
- A day cell with one or more Life Events is visually marked as highlighted (spec FR-006); a day with none is not.
- Selecting (tap/click) any day cell — highlighted or not — opens `DayEventsPanel` showing either the list of matching events (person name + event type) or an explicit "no events on this date" message (spec FR-007, Edge Cases: multiple people sharing a day are all listed).
- Navigating to a different month re-runs the derivation for the newly visible month and re-renders both the grid and any open day panel accordingly (spec acceptance scenario 5).
- Visibility of this whole view mirrors the visibility of the tree it belongs to: available to any authenticated user, and to an unauthenticated guest only when the tree is public (spec FR-021, SC-009) — enforced naturally because the view is built from the same already-permission-checked individual records used elsewhere in the tree UI; no separate access check is introduced.

## Sidebar entry point

- A new item in the left sidebar (`src/app/Sidebar.tsx`) opens this view for the tree currently in context (spec FR-004). It is visible under the same conditions as the rest of the currently-open tree's navigation.
