# Feature Specification: Usability Enhancements — Delete, Sibling Order, Tree Navigation, Email Templates, Calendar Counts

**Feature Branch**: `005-usability-enhancements`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "let update some items below: / - allow delete person and their's relationships. currently, delete fail with message: \"Không thể xoá: cá thể này vẫn còn mối quan hệ. Hãy xoá mối quan hệ trước hoặc xác nhận xoá cả mối quan hệ.\" / - allow view a specific tree by adding Xem chi tiết CTA in family tree item in list. when click on, open family tree with slug url. / - add sample template email in the UI. admin can use it or modify if needed. / - in calendar, if a date has event, it should count number of event for that date instead of just display a icon." Additional item added before planning: "giữa các anh chị em, sắp xếp theo thứ tự tăng dần từ trái sang phải: 2,3,4,5,6, ... / Người thứ 2 trong info sẽ hiện là Con Trai/Gái Trưởng tuỳ theo giới tính Nam/Nữ. Nếu giới tính không rõ thì hiển thị là \"Con Trưởng\""

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete a Person Along With Their Relationships (Priority: P1)

An administrator or editor wants to permanently remove a person from the family tree. Today, if that person has any recorded relationship (parent-child, spouse, or sibling), the delete action fails outright with a message telling them to remove relationships first or confirm a full cascade delete — but there is no way in the interface to actually give that confirmation, so deletion is completely blocked for anyone with a relationship. This story lets the user see how many relationships exist and explicitly confirm removing the person together with all of those relationships in one action.

**Why this priority**: This is a hard blocker today — any person who has at least one relationship (which describes most people in a real family tree) cannot be deleted at all. Fixing this restores a core data-management capability.

**Independent Test**: Attempt to delete a person who has one or more relationships; confirm the system shows how many relationships exist and offers an explicit confirmation; after confirming, verify the person and all of their relationships are gone and no error is shown.

**Acceptance Scenarios**:

1. **Given** a person with no relationships, **When** an admin/editor deletes that person, **Then** the person is removed immediately without any extra confirmation step.
2. **Given** a person with one or more relationships, **When** an admin/editor initiates delete, **Then** the system shows the number of relationships that will also be removed and requires an explicit confirmation before proceeding.
3. **Given** the relationship-removal confirmation is shown, **When** the user confirms, **Then** the person and every one of their relationships are deleted, and the person no longer appears anywhere in the tree (including as a parent/child/spouse/sibling reference for other people).
4. **Given** the relationship-removal confirmation is shown, **When** the user cancels instead of confirming, **Then** nothing is deleted and the person and their relationships remain unchanged.
5. **Given** a person with relationships, **When** delete is attempted, **Then** the user never sees the raw blocking error message ("Không thể xoá: ...") as a dead end — they are always offered the confirm-and-cascade path instead.

---

### User Story 2 - Siblings Ordered Left-to-Right, With a Proper Eldest-Child Label (Priority: P2)

A family tree already lets an admin/editor record each child's birth-order position among their siblings (following the existing Vietnamese convention where the eldest is recorded as position 2, then 3, 4, 5, 6, ... — there is no position 1). Today that recorded position is only shown as a small badge; it has no effect on where the sibling actually appears in the tree, so siblings can appear left-to-right in a random order that doesn't match their real birth order. Separately, the eldest child (position 2) is currently labeled the same generic way as any other sibling ("Con thứ 2"), when the eldest should instead be called out as the eldest son or eldest daughter.

**Why this priority**: The tree's visual layout is the primary thing every viewer sees for every family, every time; siblings appearing out of birth order undermines the genealogical record at a glance for the whole app. This is a correctness issue in the core tree view, so it ranks just behind the delete blocker.

**Independent Test**: Record birth-order positions (2, 3, 4, ...) for a set of siblings with mixed genders; confirm the tree renders them left-to-right in that ascending order, and confirm the sibling at position 2 shows an eldest-specific label matching their gender (or the gender-neutral label if gender isn't recorded), while siblings at position 3 and beyond keep today's plain ordinal label.

**Acceptance Scenarios**:

1. **Given** a set of siblings with recorded positions 2, 3, 4, and 5, **When** the family tree renders, **Then** they appear left-to-right in that exact ascending order.
2. **Given** a sibling group where one sibling has no recorded position, **When** the tree renders that group, **Then** the unpositioned sibling appears after every sibling that does have a recorded position.
3. **Given** a person recorded at position 2 whose gender is male, **When** their ordinal label is shown (on the tree and in their detail info), **Then** it reads "Con Trai Trưởng" instead of "Con thứ 2".
4. **Given** a person recorded at position 2 whose gender is female, **When** their ordinal label is shown, **Then** it reads "Con Gái Trưởng".
5. **Given** a person recorded at position 2 whose gender is not recorded (unknown), **When** their ordinal label is shown, **Then** it reads "Con Trưởng".
6. **Given** a person recorded at position 3 or higher, **When** their ordinal label is shown, **Then** it continues to read "Con thứ {position}" exactly as it does today.
7. **Given** a person with no recorded position at all, **When** their ordinal label is shown, **Then** today's existing fallback label continues to display, unchanged.

---

### User Story 3 - Open a Family Tree Directly From the Tree List (Priority: P2)

An administrator managing the list of family trees wants to quickly open and view a specific tree without leaving the management screen to hunt for its address. Today the tree list shows each tree's name, slug, and management actions (set default, publish/unpublish, edit slug, delete) but has no way to actually open the tree itself.

**Why this priority**: Administrators regularly need to check a tree's content while managing it (e.g., after editing its slug or publishing it); today they must know or copy the slug manually and navigate elsewhere. This is a clear efficiency gap but not a blocker like Story 1.

**Independent Test**: From the family tree list, click "Xem chi tiết" on any tree item and confirm the tree opens at its own slug-based address, showing that tree's own data.

**Acceptance Scenarios**:

1. **Given** the family tree list, **When** viewing any tree item, **Then** a "Xem chi tiết" action is visible alongside the existing management actions.
2. **Given** a tree item's "Xem chi tiết" action, **When** clicked, **Then** the corresponding family tree opens at its slug-based URL, showing that specific tree.
3. **Given** a tree whose slug was recently edited, **When** "Xem chi tiết" is clicked, **Then** the tree opens using the current (latest) slug value.

---

### User Story 4 - Start From a Sample Email Template (Priority: P3)

An administrator configuring event-reminder emails wants a ready-to-use starting point instead of an empty text box, so they can either send the default wording as-is or tweak it to match their family's tone.

**Why this priority**: This improves onboarding and reduces setup friction for the notification feature, but the notification feature is already usable without it (an admin can already type a template manually), so it is lower priority than the delete blocker and tree navigation gap.

**Independent Test**: Open the email notification settings as an admin with no template previously configured; confirm a sample template is presented, and confirm the admin can either save it unchanged or edit and save a modified version.

**Acceptance Scenarios**:

1. **Given** an admin opens the email template setting for the first time (no template previously saved), **When** the settings panel loads, **Then** a sample template with realistic placeholder text is already filled in, using the same variable placeholders the sending feature recognizes.
2. **Given** the sample template is shown, **When** the admin saves without making any changes, **Then** the sample template is stored and used for future reminder emails.
3. **Given** the sample template is shown, **When** the admin edits the text and saves, **Then** the edited version is stored and used instead, and the sample is not restored automatically afterward.
4. **Given** an admin has already customized and saved their own template previously, **When** they reopen the settings, **Then** their saved template is shown, not the sample.

---

### User Story 5 - See How Many Events Fall on a Calendar Date (Priority: P3)

A user browsing the events calendar wants to know at a glance how many events (birthdays/anniversaries) fall on a given date, not just that "something" happens that day.

**Why this priority**: This is a clarity improvement to an already-functioning calendar (dates with events are already visibly marked); it doesn't unblock any workflow, so it ranks alongside the email template improvement.

**Independent Test**: Open the events calendar for a tree that has at least one date with two or more events; confirm that date's cell displays the actual event count rather than a generic indicator, and confirm a date with exactly one event still clearly shows "1".

**Acceptance Scenarios**:

1. **Given** a calendar date with no events, **When** the calendar renders, **Then** the date shows no event count or indicator.
2. **Given** a calendar date with exactly one event, **When** the calendar renders, **Then** the date visibly shows the number 1.
3. **Given** a calendar date with multiple events, **When** the calendar renders, **Then** the date visibly shows the exact total number of events on that date.
4. **Given** a date's event count is shown, **When** the user clicks that date, **Then** the existing "click a date to see its events" popup behavior is unchanged, and the number of events listed in the popup matches the count shown on the date.

---

### Edge Cases

- What happens when a person has relationships to people who are themselves later deleted in the same session? Each deletion is independent; deleting one person's relationships does not require or trigger deletion of the related people.
- What happens if two admins try to delete the same person with relationships at the same time? The first deletion succeeds; the second attempt finds the person already gone and is treated as a no-op/already-deleted state, not an error about relationships.
- What happens when two siblings are accidentally recorded with the same position number? This is a pre-existing data-entry concern; this feature does not add new validation for it — the tied siblings' relative order between themselves is unspecified, but every other, uniquely-positioned sibling still lands in its correct ascending place.
- What happens when none of the siblings in a group have a recorded position? They keep appearing in the tree in whatever order they do today (no new guarantee is introduced when no positions exist to sort by).
- What happens if an admin clicks "Xem chi tiết" for a tree that has since been unpublished or made private by another admin? The tree opens according to the same access rules already enforced for slug URLs (denied with a clear message if the viewer isn't authorized, per existing behavior).
- What happens to the sample email template's placeholder variables if the underlying set of available variables changes in the future? Out of scope for this feature — the sample simply uses the variables available today.
- What happens on a date with a very large number of events (e.g., 15+)? The exact count is still displayed; no truncation like "9+".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an admin/editor to delete a person who has zero relationships without any additional confirmation beyond the existing standard delete confirmation.
- **FR-002**: System MUST, before deleting a person who has one or more relationships, show the user the number of relationships that will be removed and require an explicit, separate confirmation of that cascade before proceeding.
- **FR-003**: System MUST, upon confirmed cascade delete, remove the person and every relationship record referencing that person (as either party) so no dangling relationship remains.
- **FR-004**: System MUST NOT present the raw "cá thể này vẫn còn mối quan hệ" blocking error to the user as a final, unresolvable outcome when they have not yet been offered the cascade-confirmation option.
- **FR-005**: System MUST leave the person and their relationships completely unchanged if the user cancels the cascade-confirmation step.
- **FR-006**: System MUST arrange siblings left-to-right in the family tree layout in ascending order of their recorded birth-order position (2, 3, 4, 5, 6, ...).
- **FR-007**: System MUST place any sibling without a recorded birth-order position after every sibling in the same group that does have one, when arranging them left-to-right.
- **FR-008**: System MUST display "Con Trai Trưởng" as the ordinal label for a person recorded at birth-order position 2 whose gender is male.
- **FR-009**: System MUST display "Con Gái Trưởng" as the ordinal label for a person recorded at birth-order position 2 whose gender is female.
- **FR-010**: System MUST display "Con Trưởng" as the ordinal label for a person recorded at birth-order position 2 whose gender is not recorded (unknown).
- **FR-011**: System MUST continue displaying the existing "Con thứ {position}" ordinal label, unchanged, for every person recorded at birth-order position 3 or higher.
- **FR-012**: System MUST continue displaying today's existing fallback ordinal label, unchanged, for a person with no birth-order position recorded at all.
- **FR-013**: System MUST apply the eldest-child labeling (FR-008 through FR-010) consistently everywhere the ordinal label is already shown today (the tree view and the person's detail information).
- **FR-014**: System MUST display a "Xem chi tiết" action on every family tree item in the family tree list.
- **FR-015**: System MUST, when "Xem chi tiết" is activated for a tree, open that specific tree at its own slug-based address.
- **FR-016**: System MUST use the tree's current slug value when opening it via "Xem chi tiết", reflecting any prior slug edits.
- **FR-017**: System MUST present a pre-filled sample email template in the notification/email template setting whenever no template has been explicitly saved yet.
- **FR-018**: System MUST allow the admin to save the sample template unchanged as their active template.
- **FR-019**: System MUST allow the admin to edit the sample template's text and save the edited version as their active template, replacing the sample.
- **FR-020**: System MUST continue showing the admin's previously saved custom template (not the sample) once a custom template has been saved.
- **FR-021**: The sample email template MUST use the same placeholder variables recognized by the email-sending feature, so it works correctly if saved unmodified.
- **FR-022**: System MUST display, for each calendar date that has at least one event, the exact number of events on that date rather than a generic presence indicator.
- **FR-023**: System MUST display no event count or indicator on calendar dates with zero events.
- **FR-024**: System MUST keep the existing date-click popup behavior (listing that date's events, or a "no events" message) unchanged and consistent with the displayed count.

### Key Entities

- **Individual (existing entity)**: A person in the family tree; this feature changes how deletion of an individual with existing relationships is confirmed and executed, and also uses the individual's already-recorded birth-order position and gender to determine tree layout order and ordinal label — no new attributes are introduced.
- **Relationship (existing entity)**: A parent-child, spouse, or sibling link between two individuals; this feature ensures all relationships referencing a deleted individual are removed together with that individual when confirmed.
- **Family Tree (existing entity)**: A named, sluggable collection of individuals; this feature adds a direct "view" entry point from the tree list to a tree's existing slug-based address, introducing no new attributes.
- **Email/Notification Template (existing entity)**: The reusable text used for event-reminder emails; this feature adds a default sample value for it when none has been configured, without changing its format or the variables it supports.
- **Calendar Event Day**: A calendar date that has one or more life events; this feature changes how the count of events on that date is presented, not how events are computed or matched to dates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of person deletions for individuals with existing relationships can be completed by an admin/editor without contacting support or being permanently blocked, provided they confirm the cascade.
- **SC-002**: After a confirmed cascade delete, 0 relationship records referencing the deleted person remain in the system.
- **SC-003**: 100% of siblings that have a recorded birth-order position appear left-to-right in the tree in ascending order of that position.
- **SC-004**: 100% of people recorded at birth-order position 2 are shown with an eldest-specific label (matching their recorded gender, or the gender-neutral form) rather than the generic ordinal label.
- **SC-005**: An admin can open any listed family tree's own page in a single click from the tree list, 100% of the time the tree is accessible to them.
- **SC-006**: A new admin configuring email reminders for the first time sees a usable sample template with 0 required setup steps before it can be saved and used.
- **SC-007**: Users can determine the exact number of events on any highlighted calendar date without clicking into it, for 100% of dates with events.

## Assumptions

- The confirmation step for cascade delete is a single explicit action (e.g., a checkbox or confirmation button) rather than a multi-step wizard, consistent with how other destructive confirmations already work in the app.
- "Position 2" refers to the already-established Vietnamese ordinal convention in this app, where the eldest child is recorded as position 2 (there is no position 1) and each subsequent child is 3, 4, 5, and so on — this feature does not change that numbering convention, only how position 2 is labeled and how all positions affect left-to-right layout.
- The eldest-child labeling change applies wherever the ordinal label is already shown today (the tree node and the person's detail information), not just one surface.
- No new data field, migration, or validation rule is introduced; this feature only changes how the already-recorded birth-order position is used (for layout ordering) and displayed (for the position-2 case).
- "Xem chi tiết" opens the tree in the same way any other slug URL is opened today, subject to the same visibility/access rules already in place for public vs. private trees.
- The sample email template's wording is a reasonable, realistic Vietnamese default (using the same placeholder variables already supported by the reminder-sending feature) that admins can fully replace; no additional selectable templates beyond one sample are required.
- "Count" on a calendar date refers to the total number of life events (birthdays and death anniversaries combined) landing on that date, matching what the date's detail popup already lists.
- No changes to who can perform these actions are introduced: delete remains available to the same roles as today (admin/editor), tree list and "Xem chi tiết" remain admin-only consistent with the existing tree management screen, and email template configuration remains admin-only.
