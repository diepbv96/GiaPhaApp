# Feature Specification: Individuals Admin Dashboard

**Feature Branch**: `007-individuals-admin-dashboard`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "add a admin dashboard page to allow admin/editor can manage all individuals (see list, filter by family tree, search by name, edit info, delete individual,...)"

## Clarifications

### Session 2026-07-21

- Q: When an admin/editor deletes an individual from the new dashboard, what should happen? → A: Full delete everywhere — the individual is removed entirely from the system, including every family tree membership and every relationship in every tree they belong to. Removing a person from just one tree while keeping them in others remains a separate, already-existing action elsewhere in the app; this dashboard's delete action is the full, system-wide removal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and locate any individual (Priority: P1)

An admin or editor needs a single place to see every individual recorded in the system, regardless of which family tree they belong to, and quickly narrow that list down to a specific family tree or a specific person by name.

**Why this priority**: Without a reliable way to find a person, no other management action (editing or deleting) is possible. This is the foundation the rest of the dashboard depends on.

**Independent Test**: Can be fully tested by opening the dashboard, confirming individuals from multiple family trees appear in one list, then using the family tree filter and the name search independently (and together) to confirm the list narrows correctly.

**Acceptance Scenarios**:

1. **Given** an admin or editor opens the individuals dashboard, **When** the page loads, **Then** they see a list of individuals from all family trees they have access to, with each row showing the person's name and which family tree(s) they belong to.
2. **Given** the dashboard is showing all individuals, **When** the admin/editor selects a specific family tree from the filter, **Then** the list updates to show only individuals who belong to that family tree.
3. **Given** the dashboard is showing all individuals, **When** the admin/editor types a name (or part of a name) into the search field, **Then** the list updates to show only individuals whose name or alias matches the search text.
4. **Given** a family tree filter and a name search are both applied, **When** the admin/editor views the list, **Then** only individuals that satisfy both conditions are shown.
5. **Given** no individuals match the current search/filter combination, **When** the admin/editor views the list, **Then** a clear "no results" message is shown instead of an empty table.
6. **Given** a user who is not an admin or editor (e.g., a viewer or unauthenticated visitor), **When** they attempt to open the dashboard, **Then** they are denied access.

---

### User Story 2 - Edit an individual's information from the dashboard (Priority: P2)

An admin or editor spots incorrect or outdated information on an individual while browsing the dashboard and wants to correct it immediately, without navigating into that person's family tree canvas.

**Why this priority**: Editing is the most frequent corrective action admins/editors take once they've found a record, but it depends on the browsing/search capability from User Story 1.

**Independent Test**: Can be fully tested by locating an individual in the list, opening their edit form from the dashboard, changing a field (e.g., full name), saving, and confirming the update appears both in the dashboard list and in that person's family tree.

**Acceptance Scenarios**:

1. **Given** an admin or editor has located an individual in the dashboard list, **When** they choose to edit that individual, **Then** a form opens pre-filled with that individual's current information.
2. **Given** the edit form is open, **When** the admin/editor changes one or more fields and saves, **Then** the changes are persisted and immediately reflected in the dashboard list and in every family tree view where that individual appears.
3. **Given** the edit form is open, **When** the admin/editor submits invalid data (e.g., a blank required name), **Then** the system rejects the save and explains what needs to be corrected.
4. **Given** the edit form is open, **When** the admin/editor cancels without saving, **Then** no changes are applied.

---

### User Story 3 - Delete an individual from the dashboard (Priority: P3)

An admin or editor determines that an individual record was created in error or is no longer needed at all (for example, a duplicate entry or a test record) and needs to remove that person entirely.

**Why this priority**: Deletion is the least frequent and highest-risk action, and is only safe once reliable browsing (User Story 1) and correction via editing (User Story 2) are in place — most bad-data problems are fixed by editing, not deleting.

**Independent Test**: Can be fully tested by locating an individual in the list, deleting them, confirming the deletion, and verifying the individual no longer appears in the dashboard, in any family tree they previously belonged to, or in any relationship that referenced them.

**Acceptance Scenarios**:

1. **Given** an admin or editor has located an individual in the dashboard list, **When** they choose to delete that individual, **Then** the system asks for explicit confirmation before making any change, and clearly states that the individual will be removed from every family tree they belong to along with all of their relationships.
2. **Given** the confirmation is shown, **When** the admin/editor confirms the deletion, **Then** the individual is permanently removed from the dashboard list, from every family tree they belonged to, and from any relationships that referenced them.
3. **Given** the confirmation is shown, **When** the admin/editor cancels, **Then** no data is changed and the individual remains exactly as before.
4. **Given** a user who is not an admin or editor, **When** they view the dashboard, **Then** no delete action is available to them.

---

### Edge Cases

- What happens when the individuals list contains a very large number of records (hundreds or thousands)? The dashboard must remain responsive, e.g., by paginating or progressively loading results rather than rendering everything at once.
- What happens when a name search contains Vietnamese diacritics or is entered without them (e.g., searching "Nguyen" should still find "Nguyễn")? The search should be tolerant of this rather than requiring an exact diacritic match.
- What happens when an individual belongs to more than one family tree? The list must show all of that individual's family trees, and editing or deleting them must apply consistently across every tree they belong to (not just the one currently selected in the filter, if any).
- What happens when an admin/editor tries to edit or delete an individual that another user has just deleted (stale row)? The system should reject the action and inform the user the record no longer exists, rather than silently failing or corrupting data.
- What happens when an admin/editor applies a family tree filter and then clears it? The list should return to showing individuals from all family trees.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dashboard page, accessible only to users with the admin or editor role, that lists all individuals across every family tree in the system.
- **FR-002**: System MUST show, for each individual in the list, at minimum their name and the family tree(s) they belong to.
- **FR-003**: System MUST allow the admin/editor to filter the list to show only individuals belonging to a single, selected family tree, and to clear that filter to return to the full list.
- **FR-004**: System MUST allow the admin/editor to search the list by name, matching against an individual's full name and alias, with partial and case-insensitive matching.
- **FR-005**: System MUST allow the family tree filter and the name search to be applied together, showing only individuals that satisfy both.
- **FR-006**: System MUST display a clear "no results" state when a search/filter combination matches no individuals.
- **FR-007**: System MUST allow the admin/editor to open an edit form for any individual directly from the dashboard, pre-filled with that individual's current information.
- **FR-008**: System MUST validate edits before saving and reject invalid submissions (e.g., missing required name) with a clear explanation.
- **FR-009**: System MUST persist edits made from the dashboard and reflect them immediately in the dashboard list and in every family tree view where the individual appears.
- **FR-010**: System MUST allow the admin/editor to permanently delete an individual from the dashboard, removing that individual from every family tree they belong to and from all relationships that reference them.
- **FR-011**: System MUST require explicit confirmation before completing a deletion, and the confirmation MUST state that the individual will be removed from all of their family trees and relationships.
- **FR-012**: System MUST prevent users without the admin or editor role from accessing the dashboard or performing any of its search, filter, edit, or delete actions.
- **FR-013**: System MUST handle attempts to edit or delete an individual that no longer exists (e.g., already deleted by another user) by rejecting the action and informing the user, without corrupting other data.
- **FR-014**: System MUST remain usable — list loads and responds to search/filter within a reasonable time — when the number of individuals is large, using pagination or equivalent progressive loading rather than rendering the entire list at once.

### Key Entities

- **Individual**: A person recorded in the system; identified by name (and optional alias), with attributes such as gender, birth/death information, and deceased status. Can belong to one or more family trees. This dashboard's edit action changes these same attributes wherever else they are shown; its delete action removes the individual and all their memberships and relationships entirely.
- **Family Tree**: A named collection of individuals and their relationships. Used here as a filter to narrow the individuals list to one tree at a time.
- **Individual–Family Tree Membership**: The association between an individual and each family tree they belong to; a single individual may have memberships in multiple family trees, all of which are shown in the dashboard and all of which are removed when that individual is deleted.
- **Relationship**: A connection between two individuals within a specific family tree (e.g., parent/child, spouse, sibling); relationships referencing a deleted individual are removed along with that individual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin or editor can find a specific individual among at least 1,000 records, using search and/or filter, in under 10 seconds.
- **SC-002**: An admin or editor can edit an individual's information from the dashboard and see the change reflected in the list and in the affected family tree(s) in under 2 seconds after saving.
- **SC-003**: 100% of deletion attempts are blocked from taking effect until the admin/editor explicitly confirms, with zero accidental (unconfirmed) deletions occurring during testing.
- **SC-004**: 100% of access attempts to the dashboard or its actions by users without admin/editor permissions are denied.
- **SC-005**: The dashboard remains responsive (list and search/filter results appear without noticeable delay) with at least 1,000 individuals in the system.

## Assumptions

- Admin and editor roles have identical permissions on this dashboard (view, search, filter, edit, delete); viewers and unauthenticated users have no access, consistent with how these roles are already treated elsewhere in the system.
- "Delete individual" means permanently removing that person from the system entirely — including every family tree membership and every relationship that references them — as distinct from removing a person from just one family tree (an existing, separate capability elsewhere in the app).
- The edit form on this dashboard covers the same set of individual attributes already captured elsewhere in the system (name, alias, gender, birth/death details, deceased status, notes, photo) rather than introducing new fields.
- When no family tree filter is applied, the list shows individuals from all family trees the current user has access to.
- Name search is tolerant of Vietnamese diacritics (e.g., a search without diacritics can still match names that include them).
