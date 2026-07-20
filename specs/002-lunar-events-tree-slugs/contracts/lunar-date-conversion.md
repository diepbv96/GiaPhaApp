# Contract: Gregorian → Lunar Date Conversion

**Module**: `src/lib/lunarCalendar.ts` (pure function, no I/O, no dependency)

## Function contract

```text
toLunarDate(gregorian: { day: number; month: number; year: number }): LunarDate | null
```

- **Input**: a fully-specified Gregorian calendar date (day, month, year all known — this function is never called for a `date_precision` other than `day`; callers are responsible for that check, per spec FR-003).
- **Output**:
  - A `LunarDate` — `{ day: number; month: number; year: number; isLeapMonth: boolean }` — when the input falls within the supported range (Gregorian years 1800–2199).
  - `null` when the input is outside the supported range. Callers MUST treat `null` as "lunar date unavailable" (spec FR-003, Edge Cases) and MUST NOT guess or approximate a value.
- **Determinism**: pure function of its input; no dependency on the caller's current date, locale, or browser time zone. Internally anchored to UTC+7 (Vietnam) for the solar-term calculations the algorithm requires.
- **Leap months**: when the Gregorian date maps to a lunar leap month, `isLeapMonth` is `true` and the UI MUST label it unambiguously (e.g., "tháng 4 nhuận") rather than presenting it identically to the regular fourth month (spec Edge Cases).

## Consumers

- Person detail view (spec User Story 1): calls this once per fully-known birth date and once per fully-known death date.
- Calendar grid (spec User Story 2): calls this once per visible day in the rendered month to populate each cell's lunar label.

## Out of scope for this contract

- Lunar → Gregorian conversion (not required by any acceptance scenario).
- Any persistence of the computed value (spec Assumptions: never stored).
