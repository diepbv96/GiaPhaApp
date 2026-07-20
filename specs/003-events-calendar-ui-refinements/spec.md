# Feature Specification: Events, Calendar & Navigation UI Refinements

**Feature Branch**: `003-events-calendar-ui-refinements`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "I want to update and refactor some functionalities below: / - Ensure next events is displayed for specific family tree. / - Event calendar should display widely (about 80% screen), no separate view box for event detail. when user click on a date, a popup show up to display events for that date. show message in popup if no event for that date. / - view mode with slug url also display sidebar menu as well. / - lunar date format should be displayed as "DD/MM/YYYY AL" inline with the date value, eg: 01/01/2025 (10/12/2024 AL) / - update label "Chỉ hiển thị cùng huyết thống" to "Ẩn dâu/rễ" / - app label should be updated to "Gia Phả App""

## Clarifications

### Session 2026-07-20

- Q: TreeBySlug (a non-default tree opened by its slug URL) was deliberately built read-only in the previous feature — only the home screen's default tree supports management actions today. Should the slug view's sidebar include the Admin/Editor management section (add individual, import) too, or just the viewing options (hide-in-laws toggle, export, Upcoming Events, account actions)? → A: Full management parity — Admin/Editor get the same add/edit/delete-individual, relationship, and import controls (and drag-to-reposition) on a slug-viewed tree as on the default tree. The previous read-only-via-slug design is superseded for authorized roles; Viewer/guest still get read-only access, unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Navigation and Management for Any Tree, Including by Slug URL (Priority: P1)

Today, "Sự kiện sắp tới" (Upcoming Events) always shows the one default family tree's events, no matter how it was reached — and a family tree opened via its own shareable slug URL has no sidebar at all and is entirely read-only, so there is no way to reach that tree's events, its other viewing options (hide in-laws, export), or — for Admin/Editor — to manage it, in the first place. A user viewing a specific, non-default tree by its slug link wants the exact same capabilities as someone viewing the default tree on the home screen: the same sidebar, the same management actions if they're Admin/Editor, and "Upcoming Events" that reflects *that* tree, not always the default one.

**Why this priority**: Without this, the Upcoming Events feature is effectively unreachable and incorrect for every tree except the one default tree, and every non-default tree remains unmanageable outside the Tree Management screen — the single biggest gap left over from the previous rollout, and a prerequisite for the calendar UI changes below to matter for more than one tree.

**Independent Test**: Open a non-default, slug-accessible tree by its URL as Admin/Editor; confirm the same sidebar (viewing options *and* management actions) appears and that adding/editing/deleting an individual works exactly as it does on the default tree; open "Upcoming Events" from it and confirm the calendar reflects that tree's own people, not the default tree's.

**Acceptance Scenarios**:

1. **Given** a user opens a family tree by its slug URL, **When** the page loads, **Then** the same sidebar navigation shown on the home screen is shown, scoped to that tree — viewing options, export, "Upcoming Events," account actions, and, for Admin/Editor, the individual-management section (add, import).
2. **Given** an Admin or Editor is viewing a tree by its slug URL, **When** they add, edit, delete, or reposition an individual, or create a relationship, **Then** it behaves identically to doing so on the default tree from the home screen.
3. **Given** a Viewer or an unauthenticated guest is viewing a tree by its slug URL, **When** the sidebar renders, **Then** no management controls are shown — only viewing options — exactly as on the default tree today for those roles.
4. **Given** a user on a slug-URL tree selects "Upcoming Events" from the sidebar, **When** the calendar opens, **Then** it shows events for that specific tree's people, not the default tree's.
5. **Given** a user on the home screen (default tree) selects "Upcoming Events," **When** the calendar opens, **Then** it continues to show the default tree's events, unchanged from today.
6. **Given** a guest (not signed in) opens a public, non-default tree by its slug URL, **When** the page loads, **Then** they see the same read-only sidebar and can reach that tree's Upcoming Events exactly as an authenticated Viewer would (consistent with the existing guest-visibility rule).

---

### User Story 2 - A Wider Calendar With Event Details in a Popup (Priority: P2)

Today, the calendar and the selected day's event list sit side-by-side as two separate boxes, each getting only half the available space. A user wants the calendar itself to be the large, primary thing on screen, with a chosen date's events appearing in a popup on top of it instead of permanently occupying half the layout.

**Why this priority**: A clear usability improvement to the already-shipped calendar, independent of which tree it's showing or how it's reached (User Story 1) — it only changes layout and interaction, not data.

**Independent Test**: Open "Upcoming Events" for any tree; confirm the calendar occupies the large majority of the screen with no permanently visible side panel; click a date and confirm a popup appears with that date's events (or a clear "no events" message), and that closing it returns to the full calendar.

**Acceptance Scenarios**:

1. **Given** the Upcoming Events view is open, **When** it renders, **Then** the calendar grid occupies the large majority of the available screen space, with no separate, always-visible event-detail box beside it.
2. **Given** a user clicks a date that has one or more events, **When** the click registers, **Then** a popup appears listing those events (person and event type), overlaying the calendar rather than sitting beside it.
3. **Given** a user clicks a date with no events, **When** the click registers, **Then** the same popup appears with a clear "no events on this date" message, not a blank or missing popup.
4. **Given** the popup is open, **When** the user dismisses it, **Then** the full-width calendar is shown again with nothing obscuring it.

---

### User Story 3 - Read Lunar Dates in a Compact, Inline Format (Priority: P3)

Today, a lunar date is shown as its own separate line of Vietnamese prose (e.g., "Ngày 10 tháng 12 năm 2024 (âm lịch)") underneath the Gregorian date. A user wants it shown compactly, inline, right next to the Gregorian date it corresponds to — e.g. `01/01/2025 (10/12/2024 AL)`.

**Why this priority**: A presentation-only change to already-shipped functionality; lower priority than fixing reachability/correctness (User Story 1) or the calendar's layout (User Story 2), but still user-visible everywhere a lunar date already appears.

**Independent Test**: Open any person's detail view for someone with a fully-known birth date; confirm the lunar date appears on the same line as the Gregorian date, formatted as `DD/MM/YYYY AL`, rather than on its own line below it.

**Acceptance Scenarios**:

1. **Given** a person has a fully-known birth date, **When** their detail view is shown, **Then** the birth date reads as `<Gregorian DD/MM/YYYY> (<lunar DD/MM/YYYY> AL)` on a single line — e.g. `01/01/2025 (10/12/2024 AL)`.
2. **Given** the same is true for a fully-known date of death, **When** shown, **Then** it follows the identical inline format.
3. **Given** a lunar date falls in a leap month, **When** displayed, **Then** the leap month is still shown unambiguously within the compact format (not silently dropped).
4. **Given** a date's lunar equivalent is unavailable (partial date, or outside the supported conversion range), **When** displayed, **Then** the existing "unavailable" indication is shown instead of a malformed or partial `AL` value.

---

### User Story 4 - Updated Wording for the In-Laws Toggle and the App's Own Name (Priority: P4)

Today the sidebar toggle reads "Chỉ hiển thị cùng huyết thống" and the application's own generic name (shown before any specific tree's name is known, e.g. the browser tab title) reads "Gia Phả Dòng Họ Bùi." A user wants the toggle relabeled to "Ẩn dâu/rễ" and the app's own name changed to "Gia Phả App," everywhere either currently appears — without changing what either one actually does, or renaming any specific family tree.

**Why this priority**: Pure copy changes with no behavioral effect; lowest risk and lowest priority, bundled together since both are simple find-and-replace-style updates.

**Independent Test**: Load the app before any tree data appears (e.g. the browser tab/title) and confirm it reads "Gia Phả App"; open the sidebar and confirm the toggle reads "Ẩn dâu/rễ" and still hides/shows in-laws exactly as before under its old label.

**Acceptance Scenarios**:

1. **Given** the sidebar viewing options are shown, **When** rendered, **Then** the in-laws toggle is labeled "Ẩn dâu/rễ" and continues to hide/show in-law relatives exactly as it did under its previous label.
2. **Given** the application's own generic name is shown anywhere it isn't standing in for a specific family tree's name (e.g. browser tab title, sign-in screen), **When** rendered, **Then** it reads "Gia Phả App."
3. **Given** a specific family tree has its own name (e.g. shown as the sidebar title once a tree has loaded), **When** rendered, **Then** that tree's own name is shown unchanged — this rename only affects the app's own generic label, never a family tree's name.

---

### Edge Cases

- What happens when a slug-URL tree's viewer clicks "Upcoming Events" and that tree has no people with any fully-known birth/death date? The calendar still opens for that tree, simply with no highlighted days anywhere.
- What happens to the previous "read-only via slug" design? It is superseded for Admin/Editor (who now get full management parity on any tree they can already manage); Viewer and guest experience on a slug-viewed tree is unchanged — read-only, exactly as before.
- What happens if a user opens the events popup for a date, then navigates to a different month without closing it first? The popup closes (or updates to reflect that it's no longer showing a date from the visible month) rather than showing stale data.
- What happens with the inline lunar format when the Gregorian and lunar dates fall in different lunar years around Tết? Both the day/month/year of the lunar side are shown exactly as computed — no special-casing beyond the standard `DD/MM/YYYY AL` format.
- What happens to the "no events" message once shown in the new popup? It remains the same clear, explicit message as today, just relocated into the popup instead of the side panel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scope the "Upcoming Events" calendar to the specific family tree the user navigated from — the default tree when reached from the home screen, or the specific tree when reached from that tree's slug URL — never always defaulting to the one default tree regardless of origin.
- **FR-002**: System MUST show the same sidebar navigation when viewing a family tree by its slug URL as when viewing the default tree on the home screen, scoped to that specific tree — including, for Admin/Editor, the individual-management section (add, import) and the ability to edit, delete, and reposition individuals and create relationships, identically to how those actions work on the default tree today.
- **FR-002a**: System MUST continue to show only read-only viewing options — never management controls — to a Viewer or an unauthenticated guest on a slug-viewed tree, exactly as on the default tree today.
- **FR-003**: System MUST preserve the existing guest-visibility rule (a public tree's calendar, sidebar, and read-only viewing are reachable without signing in; a private tree's are not) when extending the sidebar and events access to slug-viewed trees. This rule change does not alter Viewer/guest permissions — only Admin/Editor management capability on non-default trees is newly enabled.
- **FR-004**: The Upcoming Events calendar grid MUST occupy the large majority (approximately 80%) of the available screen space, with no separate, permanently-visible event-detail box next to it.
- **FR-005**: Selecting any date on the calendar MUST open a popup showing that date's matching events, or a clear "no events on this date" message when none match — never a blank or missing popup.
- **FR-006**: Dismissing the date popup MUST return to the full calendar view with nothing else obscuring it.
- **FR-007**: Wherever a lunar date is shown alongside its corresponding Gregorian date, it MUST be formatted as `DD/MM/YYYY AL` and appear inline with (on the same line as) that Gregorian date, e.g. `01/01/2025 (10/12/2024 AL)`.
- **FR-008**: The inline lunar format MUST still unambiguously indicate a leap month and MUST still show an explicit "unavailable" indication instead of a value when the lunar date cannot be computed — this change is presentation-only and MUST NOT alter which dates can or cannot be converted.
- **FR-009**: System MUST relabel the sidebar's in-laws-hiding toggle from "Chỉ hiển thị cùng huyết thống" to "Ẩn dâu/rễ" without changing its underlying behavior.
- **FR-010**: System MUST update the application's own generic name — shown wherever it represents the app itself rather than a specific family tree (e.g. browser tab title, sign-in screen) — to "Gia Phả App," leaving every individual family tree's own name unchanged.

### Key Entities

No new data entities are introduced by this feature — it changes how already-existing data (family trees, individuals, computed lunar dates, computed Life Events) is routed to and displayed in the UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user viewing any non-default tree by its slug URL can reach that tree's own Upcoming Events calendar, and — if Admin/Editor — every management action, in the same number of steps as a user viewing the default tree from the home screen.
- **SC-002**: 100% of the events shown when opening the calendar from a specific slug-viewed tree belong to that tree, not the default tree; and 100% of add/edit/delete/import actions performed on a slug-viewed tree affect only that tree's data.
- **SC-003**: The calendar grid is the visually dominant element of the Upcoming Events view, with no independent event-detail box competing for space alongside it.
- **SC-004**: A user can view any date's events (or confirm there are none) in a single click from the calendar, via a popup that closes without leaving the page.
- **SC-005**: Every lunar date shown anywhere in the app reads as a single inline value in the `DD/MM/YYYY AL` format next to its Gregorian counterpart, with zero instances of the old separate-line format remaining.
- **SC-006**: The relabeled toggle and the app's generic name read "Ẩn dâu/rễ" and "Gia Phả App" respectively everywhere they appear, with zero remaining instances of the old wording.

## Assumptions

- "Next events" in the request refers to the already-existing "Upcoming Events" (Sự kiện sắp tới) calendar feature, not a new, separate "next N events" widget — the request is about correcting which tree it reflects, not adding a new view.
- The compact `DD/MM/YYYY AL` inline format applies wherever a lunar date is paired with a full Gregorian date value (person detail, and the events popup's date heading). It does not apply to the calendar grid's own per-day cells, which remain a distinct, deliberately compact day/month indicator — there isn't room in a single grid cell for a full `DD/MM/YYYY AL` value, and the request's own example pairs the new format with a full date value, not a bare day.
- "App label" refers to the application's own generic/brand name — anywhere it is shown standing in for the app itself rather than for one specific family tree (e.g., the browser tab title and the sign-in screen's heading) — not to any individual family tree's own name, which continues to be whatever that tree's creator named it.
- The requested toggle label "Ẩn dâu/rễ" is used exactly as given; no spelling correction is applied.
- No changes to underlying permissions, data, or the guest/authenticated visibility rules established previously — this feature is UI/navigation/formatting only.
