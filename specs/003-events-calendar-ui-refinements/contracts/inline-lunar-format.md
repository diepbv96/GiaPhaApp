# Contract: Inline Lunar Date Format

## `formatLunarDate` (`src/features/individuals/LunarDateBadge.tsx`)

```text
formatLunarDate(lunar: LunarDate): string
```

- **Output**: `"${pad2(lunar.day)}/${pad2(lunar.month)}/${lunar.year} AL"`, with `" (nhuận)"` appended when `lunar.isLeapMonth` is `true`.
  - Non-leap example: `10/12/2024 AL`
  - Leap example: `20/04/2020 AL (nhuận)`
- This replaces the previous output shape ("Ngày 10 tháng 12 năm 2024 (âm lịch)"). No change to `toLunarDate`'s computation (`src/lib/lunarCalendar.ts`) — this is a pure string-formatting change (spec FR-008).

## Where it is shown inline with its Gregorian counterpart

- **`IndividualDetailPanel.tsx`** (person detail, birth/death dates): the existing Gregorian text (`formatPartialDate`, already `DD/MM/YYYY` for full-precision dates) and the lunar badge render on the **same line**: `"<gregorian> (<lunar>)"`, e.g. `01/01/2025 (10/12/2024 AL)` (spec FR-007, User Story 3 acceptance scenarios 1–2). The badge component changes from a block-level element to an inline one so this pairing is possible.
- **`DayEventsPanel.tsx`** popup heading (see `calendar-popup-layout.md`): the selected date's Gregorian `DD/MM/YYYY` plus its lunar equivalent in the same inline shape.

## Where it is unchanged (out of scope)

- **`CalendarGrid.tsx`** per-day cells keep their existing compact indicator (day/month numbers plus a leap flag), unchanged by this feature — there is no room in a 7-column grid cell for a full `DD/MM/YYYY AL` string, and the request's own example pairs the new format with a full date value, not a bare grid day (spec Assumptions).

## Unavailable case (unchanged behavior, inline placement)

- When a date's lunar equivalent cannot be computed (partial precision, or outside the supported conversion range), the existing "unavailable" indication is still shown — never a malformed or partial `AL` value (spec FR-008, User Story 3 acceptance scenario 4). It is shown on the same line as the Gregorian value, consistent with the new inline convention, rather than as a separate paragraph.
