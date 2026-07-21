# Feature Specification: Family Tree Naming, Multi-Tree Membership & Relationship Management

**Feature Branch**: `006-family-tree-relationship-management`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "create spec files for enhancement feature:
- allow admin edit family tree name.
- each person should belong to one or more family tree.
- Allow admin/editor manage relationship of specific person in a family tree (add/update/delete). only allow link to person in same family tree (selection list must display persons in same family tree only)"

## Clarifications

### Session 2026-07-21

- Q: When a person belongs to multiple family trees and one of those trees is publicly viewable (anonymous/public access), should the public view of that person ever reveal that they belong to other family trees? → A: Never reveal other tree memberships to public/anonymous viewers — only logged-in admins/editors can see a person's full list of family tree memberships. Public viewers continue to see only the public tree's own data, unchanged from today. The core scope stays focused on: (1) a person can belong to one or more family trees, and (2) when adding/editing a person's relationships, admins/editors can only link to other people who belong to that same family tree.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage a person's relationships within one family tree (Priority: P1)

An admin or editor is building out a family tree and needs to add, update, or remove the relationships (e.g., parent/child, spouse, sibling) for a specific person. When choosing who a person relates to, they must only be able to pick from people who belong to the same family tree, so the tree's structure stays internally consistent and free of accidental cross-tree links.

**Why this priority**: This is the core, day-to-day workflow for building and correcting a family tree. Without reliable, correctly scoped relationship management, the tree's structure cannot be trusted, which undermines every other feature built on top of it.

**Independent Test**: Can be fully tested by opening a person's record in a given family tree, adding a new relationship (selecting another person from a list that only shows people in that same tree), then updating and deleting that relationship — confirming at every step that people from other family trees never appear as selectable options.

**Acceptance Scenarios**:

1. **Given** an admin or editor is viewing a person within Family Tree A, **When** they open the "add relationship" action for that person, **Then** the person-selection list shows only people who belong to Family Tree A.
2. **Given** a person in Family Tree A has an existing relationship, **When** an admin or editor updates the relationship type (e.g., from "sibling" to "spouse"), **Then** the change is saved and reflected immediately for that person.
3. **Given** a person in Family Tree A has an existing relationship, **When** an admin or editor deletes that relationship, **Then** the relationship no longer appears for either person involved.
4. **Given** two people belong to different family trees, **When** an admin or editor attempts to create a relationship between them, **Then** the system prevents it because neither person appears in the other's selection list.
5. **Given** a user with viewer-only permissions, **When** they view a person's relationships, **Then** they can see the relationships but cannot add, update, or delete them.

---

### User Story 2 - Assign a person to more than one family tree (Priority: P2)

An admin or editor manages people who are part of more than one family tree (for example, a shared ancestor connecting two family branches that are tracked as separate trees, or a person who marries into another family's tree). They need to add an existing person to an additional family tree, and confirm that person's information and relationships stay correctly separated per tree.

**Why this priority**: This unlocks tracking real-world family structures that span multiple trees, but it builds on the single-tree relationship management from User Story 1 and is less frequently used day-to-day.

**Independent Test**: Can be fully tested by taking a person who exists in Family Tree A, adding them to Family Tree B, confirming they now appear in Family Tree B's person list, and confirming their relationships in Family Tree A are unaffected and not shown as options when managing relationships in Family Tree B.

**Acceptance Scenarios**:

1. **Given** a person exists only in Family Tree A, **When** an admin or editor adds that person to Family Tree B, **Then** the person appears in the person list for both Family Tree A and Family Tree B.
2. **Given** a person belongs to two family trees, **When** an admin or editor views that person's relationships in Family Tree A, **Then** only relationships created within Family Tree A are shown, not relationships from Family Tree B.
3. **Given** a person belongs to more than one family tree, **When** an admin or editor removes that person from one of those trees, **Then** the person and their relationships in the remaining tree(s) are unaffected.
4. **Given** a person belongs to only one family tree, **When** an admin or editor attempts to remove them from that tree, **Then** the system prevents the removal or requires confirmation, since it would leave the person with no family tree.

---

### User Story 3 - Rename an existing family tree (Priority: P3)

An admin needs to correct a typo or update the display name of a family tree after it has already been created (for example, after a family surname was misspelled, or the tree's scope changed).

**Why this priority**: This is a straightforward quality-of-life fix. It's valuable but lower-impact and lower-frequency than relationship and membership management.

**Independent Test**: Can be fully tested by opening an existing family tree's settings, changing its name, saving, and confirming the new name displays everywhere the tree is referenced (lists, headers, links).

**Acceptance Scenarios**:

1. **Given** an admin is viewing an existing family tree's management screen, **When** they edit the tree's name and save, **Then** the updated name is displayed everywhere the tree is referenced.
2. **Given** an admin attempts to save a blank tree name, **When** they submit the change, **Then** the system rejects the change and explains that a name is required.
3. **Given** a non-admin user (editor or viewer), **When** they view a family tree's settings, **Then** they cannot see or use an option to rename the tree.

---

### Edge Cases

- What happens when an admin/editor tries to add a relationship between two people, but one of them has just been removed from the tree by another user (stale selection list)? The system should reject the action and refresh the list.
- What happens when an admin/editor tries to create a relationship that already exists between the same two people in the same tree? The system should prevent the duplicate and point to the existing relationship.
- What happens when an admin/editor tries to remove a person's only remaining family tree membership? The system should block the removal (see User Story 2, Scenario 4) rather than leaving an orphaned person.
- What happens when an admin tries to rename a family tree to a name identical to another existing family tree? The system should allow it, since tree names are not required to be globally unique.
- What happens when a person is removed from a family tree that still has relationships defined for them in that tree? The system should require those relationships to be removed first, or remove them automatically as part of removing the membership — this must happen without affecting the person's relationships in any other tree.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admins MUST be able to edit the name of an existing family tree at any time after creation.
- **FR-002**: The system MUST reject an empty or whitespace-only family tree name and inform the user a name is required.
- **FR-003**: Editors and viewers MUST NOT be able to rename a family tree; the rename action MUST only be available to admins.
- **FR-004**: The system MUST allow a person to belong to one or more family trees at the same time.
- **FR-005**: Admins and editors MUST be able to add an existing person to an additional family tree they are not yet part of.
- **FR-006**: Admins and editors MUST be able to remove a person from a family tree they belong to, provided the person remains a member of at least one other family tree.
- **FR-007**: The system MUST prevent a person from being removed from their only remaining family tree, and MUST inform the user why the removal is blocked.
- **FR-008**: Removing a person from one family tree MUST NOT affect that person's membership, information, or relationships in any other family tree they belong to.
- **FR-009**: Admins and editors MUST be able to add a new relationship (e.g., parent/child, spouse, sibling) for a specific person within a specific family tree.
- **FR-010**: Admins and editors MUST be able to update the type of an existing relationship within a family tree.
- **FR-011**: Admins and editors MUST be able to delete an existing relationship within a family tree.
- **FR-012**: When selecting a counterpart person for a relationship, the system MUST only display people who belong to the same family tree as the person whose relationships are being managed.
- **FR-013**: The system MUST prevent a relationship from being created between two people who do not share a common family tree.
- **FR-014**: The system MUST prevent duplicate relationships (same two people, same relationship type, same family tree) from being created.
- **FR-015**: Viewers MUST be able to see a person's relationships and family tree memberships but MUST NOT be able to add, update, or delete them, or change tree membership.
- **FR-016**: When a person belongs to multiple family trees, relationships defined within one family tree MUST be shown only in the context of that family tree, not in the person's other family trees.
- **FR-017**: Public/anonymous viewers of a publicly-shared family tree MUST NOT see any indication that a person belongs to other family trees; only authenticated admins and editors can see a person's full list of family tree memberships.

### Key Entities

- **Family Tree**: A named collection representing one family's tree. Has a name that can be edited by an admin after creation. Multiple people can belong to it.
- **Person**: An individual represented within one or more family trees. The same person record is shared across every family tree they belong to; their relationships are tracked separately per family tree.
- **Family Tree Membership**: The association between a person and a family tree, representing that the person is part of that tree. A person may have more than one membership (belong to more than one family tree); each membership can be added or removed independently.
- **Relationship**: A connection between two people (e.g., parent/child, spouse, sibling) that exists within the context of exactly one family tree. Both people in a relationship must belong to that same family tree.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can rename an existing family tree and see the updated name reflected everywhere it's displayed within 5 seconds of saving, without needing to delete and recreate the tree.
- **SC-002**: 100% of relationship person-selection lists show only people belonging to the same family tree as the person being edited — zero cross-tree people ever appear as selectable options.
- **SC-003**: A person can be added to a second family tree and have their relationships managed independently in each tree, with 0 relationships leaking between trees.
- **SC-004**: Admins/editors can add, update, or delete a relationship for a person in under 1 minute per action, without encountering an option to link to a person outside that tree.
- **SC-005**: Attempting to remove a person's last remaining family tree membership is blocked 100% of the time, preventing orphaned people with no family tree.
- **SC-006**: 0% of public/anonymous views of a family tree ever reveal that a shown person belongs to any other family tree.

## Assumptions

- "Admin" and "editor" refer to the existing user roles already used elsewhere in the application (admin, editor, viewer); this feature does not introduce new roles.
- A person's core profile information (name, dates, notes, etc.) is shared across every family tree they belong to — it is the same person record, not a separate copy per tree. Only relationships and tree membership are tracked per family tree.
- There is no fixed limit on how many family trees a single person can belong to, beyond any existing system-wide limit on the total number of family trees.
- Family tree names are not required to be globally unique; two different family trees may share the same name.
- Removing a person's membership from a family tree that still has relationships defined in that tree requires those relationships to be resolved (removed) as part of, or prior to, the membership removal — this is a data-integrity safeguard, not a new standalone feature.
- Viewer-role users retain read-only access to relationships and tree memberships, consistent with their existing read-only access elsewhere in the application.
