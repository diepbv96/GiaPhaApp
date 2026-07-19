# Feature Specification: Bùi Family Genealogy Tree (Gia Phả)

**Feature Branch**: `001-family-tree-app`

**Created**: 2026-07-19

**Status**: Draft

**Input**: User description: "create a gia phả (family genealogy) app to display the family tree of the Bùi lineage. Each individual has: full name, alias, date of birth, date of death, gender, notes (max 100 chars), and an optional single avatar photo. Relationships between individuals (parents, spouse, children, siblings, etc.) must be shown. Admin and Editor roles can add/edit/delete; Viewer role can only view. Supports importing a family tree from a predefined spreadsheet template. Up to 5 family trees can exist, with one marked as default and shown on the home page. The tree supports expand/collapse to hide or reveal detail. Visual style should use bright, easy-to-read colors and legible fonts."

## Clarifications

### Session 2026-07-19

- Q: How should the system determine two individual records refer to the same person (for duplicate detection during spreadsheet import, and data integrity generally)? → A: Exact match on full name + date of birth (when both known); flagged for manual review rather than auto-merged or auto-rejected.
- Q: What language should the app's user interface (labels, buttons, messages) use? → A: Vietnamese only.
- Q: Should exporting or printing the family tree (e.g., as an image or PDF) be included in this feature's scope? → A: Yes — include basic export/print of the current tree view.
- Q: Should unauthenticated guests be able to view a family tree without an account? → A: Yes — Admin can publish any one tree as public; guests can then view that tree (read-only) on the home page without signing in. Non-published trees still require sign-in for all three roles. Rationale: only a handful of people per lineage need accounts to manage the tree; everyone else only needs to view it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View the family tree and explore relationships (Priority: P1)

Any family member opens the app and sees the default family tree of the Bùi lineage rendered as an interactive diagram — signed in if the tree is private, or without signing in at all if Admin has published it. They can see how individuals connect to each other (parents, spouses, children, siblings) and can expand or collapse branches to control how much detail is shown at once. Selecting an individual reveals their full details (name, alias, dates, gender, notes, photo).

**Why this priority**: This is the core value of the product — without a viewable, navigable tree, nothing else matters. It is also the only capability every role (including Viewer, and unauthenticated guests when the tree is published) needs, making it the smallest possible MVP.

**Independent Test**: Can be fully tested by loading the app as a Viewer-role user, confirming the default tree renders on the home page, and confirming expand/collapse and individual-detail viewing work — without any create/edit/delete capability existing yet. Separately testable as a signed-out guest against a tree Admin has published.

**Acceptance Scenarios**:

1. **Given** a default family tree has been configured, **When** any signed-in user opens the home page, **Then** that tree is displayed automatically as a visual diagram of individuals and their relationships.
2. **Given** the tree is displayed, **When** the user collapses a branch at a given individual, **Then** all descendants/relations below that individual are hidden and the tree layout adjusts to the remaining visible nodes.
3. **Given** a branch is collapsed, **When** the user expands it again, **Then** the previously hidden individuals and relationships reappear.
4. **Given** the tree is displayed, **When** the user selects an individual, **Then** the individual's full name, alias, date of birth, date of death, gender, notes, and avatar photo (if present) are shown.
5. **Given** a relationship exists between two individuals, **When** the tree is rendered, **Then** the specific relationship type (parent-child, spouse, or sibling) is visually distinguishable.
6. **Given** the tree is displayed with a particular set of branches expanded or collapsed, **When** the user chooses to export or print it, **Then** the system produces an image or PDF file reflecting exactly what is currently visible on screen.
7. **Given** Admin has published the default tree as public, **When** an unauthenticated guest opens the home page, **Then** they see that tree and can expand/collapse, view individual details, and export/print it, exactly as a Viewer would, with no sign-in required.
8. **Given** the default tree has not been published, **When** an unauthenticated guest opens the home page, **Then** they are shown a prompt to sign in rather than any tree content.

---

### User Story 2 - Manage individuals and their relationships (Priority: P2)

An Admin or Editor adds a new family member to the tree, fills in their details, and connects them to existing individuals through one or more relationships (e.g., marks them as a child of two existing individuals, or as the spouse of another). They can also edit or remove an existing individual's details or relationships when information changes or was entered incorrectly.

**Why this priority**: Once viewing works, the tree is only useful if the family's data can be kept accurate and grown over time. This is the primary ongoing maintenance capability and the main way trees are built up manually.

**Independent Test**: Can be fully tested by signing in as an Editor, adding a new individual with a relationship to an existing individual, verifying the new individual and relationship appear correctly in the tree view, then editing and deleting that same individual.

**Acceptance Scenarios**:

1. **Given** an Admin or Editor is signed in, **When** they create a new individual with a full name and gender, **Then** the individual is saved and appears in the tree once at least one relationship links them to it.
2. **Given** an Admin or Editor is viewing an individual, **When** they add a relationship (parent, child, spouse, or sibling) to another existing individual, **Then** the relationship is reflected immediately in the tree diagram.
3. **Given** an Admin or Editor edits an individual's details, **When** they save changes, **Then** the updated information is reflected on the tree without affecting existing relationships.
4. **Given** an individual has no relationships, **When** an Admin or Editor deletes them, **Then** they are removed from the tree.
5. **Given** an individual has one or more existing relationships, **When** an Admin or Editor attempts to delete them, **Then** the system requires the relationships to be removed first, or asks for explicit confirmation that all their relationships will be removed along with them.
6. **Given** a Viewer-role user is signed in, **When** they look for add, edit, or delete controls, **Then** none are available to them.
7. **Given** an Admin or Editor enters notes longer than 100 characters for an individual, **When** they attempt to save, **Then** the system prevents saving and indicates the character limit.
8. **Given** an Admin or Editor uploads a photo for an individual who already has one, **When** the upload completes, **Then** the new photo replaces the previous one (only one avatar photo per individual at a time).

---

### User Story 3 - Bulk import a family tree from a spreadsheet (Priority: P3)

An Admin or Editor who already has family records in a spreadsheet uploads that file, formatted according to a predefined template, to populate a family tree in one step instead of entering each individual and relationship by hand.

**Why this priority**: Valuable for quickly bootstrapping a tree with many existing records, but the app is fully usable without it since individuals can already be entered manually (User Story 2). It builds on, rather than blocks, the core experience.

**Independent Test**: Can be fully tested by preparing a sample spreadsheet following the template, uploading it as an Admin or Editor, and confirming the individuals and relationships it describes appear correctly in the selected tree.

**Acceptance Scenarios**:

1. **Given** an Admin or Editor has a spreadsheet file matching the predefined template, **When** they upload it to a specific family tree, **Then** the individuals and relationships described in the file are added to that tree.
2. **Given** an uploaded spreadsheet contains rows with missing required fields (e.g., no full name or gender) or malformed dates, **When** the import runs, **Then** those rows are rejected with a clear description of the problem while valid rows are still imported.
3. **Given** an uploaded spreadsheet does not match the expected template structure, **When** the import is attempted, **Then** the system rejects the file with an explanation rather than importing partial or incorrect data.
4. **Given** an import has completed, **When** the Admin or Editor views the results, **Then** they see a summary of how many individuals/relationships were added and how many rows failed, with reasons.

---

### User Story 4 - Manage multiple family trees and choose the default (Priority: P4)

An Admin creates and organizes up to five separate family trees (for example, to represent different branches of the lineage or separate drafts), designates one of them as the default tree that is shown automatically on the home page to all users, and decides whether that tree is published (viewable by unauthenticated guests) or private (sign-in required for everyone).

**Why this priority**: Useful for organizations that need to separate or stage multiple trees, but a single working tree already satisfies most users' needs, so this is the least critical capability to ship first.

**Independent Test**: Can be fully tested by signing in as an Admin, creating a second tree (while under the limit of five), switching the default designation to it, and confirming the home page now displays that tree instead of the previous default.

**Acceptance Scenarios**:

1. **Given** fewer than 5 family trees exist, **When** an Admin creates a new one, **Then** it is added to the list of available trees.
2. **Given** 5 family trees already exist, **When** an Admin attempts to create another, **Then** the system blocks creation and explains the limit has been reached.
3. **Given** multiple family trees exist, **When** an Admin marks one of them as the default, **Then** the previous default is unmarked and the newly chosen tree is displayed on the home page for all users.
4. **Given** an Admin attempts to delete the tree currently marked as default, **When** they confirm deletion, **Then** the system requires another tree to be designated as default first, or blocks the deletion.
5. **Given** any family tree, **When** an Admin marks it as published, **Then** unauthenticated guests can view that tree's content (read-only) without signing in; **when** an Admin later marks it private again, **then** guest access to it is revoked immediately and it again requires sign-in for everyone.

---

### Edge Cases

- What happens when notes exceed the 100-character limit? The system must block saving and clearly indicate the limit.
- What happens when an imported spreadsheet contains a duplicate individual (exact match on full name and date of birth against an existing individual)? The system must flag the row as a likely duplicate for manual review rather than silently creating a second copy or auto-merging it.
- What happens when an individual's birth or death date is unknown or only partially known (e.g., year only)? The system must allow the record to be saved with the date left unspecified or partial rather than requiring an exact full date.
- What happens when a Viewer-role user directly navigates to an add/edit/delete/import screen? The system must deny the action and redirect to a view-only experience.
- What happens when an uploaded avatar photo is an unsupported file type or exceeds the size limit? The system must reject the upload and explain why.
- What happens when a tree contains many generations and would be too dense to view at once? The system must default to a collapsed/summarized view beyond a reasonable depth, letting users expand branches of interest.
- What happens when someone tries to remove the last remaining family tree? An Admin may delete it; the home page then shows the "no default tree" empty state (same as before any tree existed) until a new one is created.
- What happens when an unauthenticated guest attempts a write action (e.g., by bypassing the UI) against a published tree? The system must deny it exactly as it would for a signed-in Viewer — publishing a tree only grants read access, never write access.
- What happens when Admin un-publishes a tree a guest is currently viewing? The guest's session loses access on their next data request; the system does not need to proactively notify them, but must not continue serving that tree's content to unauthenticated requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a family tree as a visual diagram showing individuals as nodes and their relationships as connections between nodes.
- **FR-002**: System MUST support at least these relationship types between individuals: parent-child, spouse, and sibling.
- **FR-003**: System MUST allow any node in the tree to be expanded or collapsed, hiding or revealing that individual's connected descendants/relations on demand.
- **FR-004**: System MUST allow users to select an individual to view their full profile: full name, alias, date of birth, date of death, gender, notes, and avatar photo.
- **FR-005**: System MUST require full name and gender when creating an individual; alias, date of birth, date of death, notes, and avatar photo are optional.
- **FR-006**: System MUST accept unknown or partial birth/death dates (e.g., year only, or left blank) rather than requiring a complete date.
- **FR-007**: System MUST enforce a maximum of 100 characters for an individual's notes field and prevent saving values that exceed it.
- **FR-008**: System MUST allow at most one avatar photo per individual; uploading a new photo replaces any existing one.
- **FR-009**: System MUST support three user roles: Admin, Editor, and Viewer.
- **FR-010**: System MUST allow only Admin and Editor roles to create, edit, or delete individuals and relationships.
- **FR-011**: System MUST restrict the Viewer role to read-only access, with no ability to create, edit, delete, import, or manage trees.
- **FR-012**: System MUST prevent deletion of an individual who still has one or more relationships, unless the user explicitly confirms that those relationships will be removed as part of the deletion.
- **FR-013**: System MUST allow Admin and Editor roles to import individuals and relationships in bulk from a spreadsheet file that follows a predefined column template.
- **FR-014**: System MUST validate each row of an imported spreadsheet and report which rows succeeded and which failed, including the reason for each failure, without discarding the successfully validated rows.
- **FR-015**: System MUST reject an import file outright, with an explanation, when the file's overall structure does not match the predefined template.
- **FR-016**: System MUST support the existence of up to 5 family trees at a time.
- **FR-017**: System MUST prevent creation of a 6th family tree while 5 already exist, and inform the user of the limit.
- **FR-018**: System MUST allow exactly one family tree to be designated as the default at any time.
- **FR-019**: System MUST automatically display the default family tree on the home page for all users, including unauthenticated guests when that tree has been published (FR-028).
- **FR-020**: System MUST allow only the Admin role to create trees, delete trees, change which tree is designated as default, and change whether a tree is published or private.
- **FR-021**: System MUST prevent removal of the tree currently marked as default while another tree still exists, without first assigning a new default. An Admin may delete every family tree, including the last one.
- **FR-022**: System MUST present the tree and its content using a bright, high-contrast color scheme and legible typography suitable for extended reading by users of varying ages.
- **FR-023**: System MUST distinguish relationship types visually (e.g., parent-child vs. spouse vs. sibling) so a viewer can tell them apart without opening each individual's profile.
- **FR-024**: System MUST restrict access to any tree's content to signed-in users holding one of the three defined roles, except for a tree that Admin has published (FR-028), which is also viewable by unauthenticated guests.
- **FR-025**: System MUST detect likely duplicate individuals during import by checking for an exact match on full name and date of birth (when both are known) against existing individuals in the target tree, and flag matches for manual review rather than automatically merging or rejecting them.
- **FR-026**: System MUST present all user interface labels, navigation, buttons, and system messages in Vietnamese.
- **FR-027**: System MUST allow any user who can view a tree — signed-in or, for a published tree, an unauthenticated guest — to export or print the currently displayed family tree (respecting its current expand/collapse state) as an image or PDF file.
- **FR-028**: System MUST allow the Admin role to mark any one family tree as published or private; a published tree's individuals and relationships are viewable, read-only, by unauthenticated guests, while a private tree requires sign-in for all three roles as before.
- **FR-029**: System MUST NOT grant unauthenticated guests any create, edit, delete, import, or tree-management capability, regardless of whether the tree they are viewing is published.

### Key Entities

- **Individual**: A person recorded in the family tree. Attributes: full name (required), alias/nickname (optional), date of birth (optional, full or partial), date of death (optional, full or partial), gender (required), notes (optional, max 100 characters), avatar photo (optional, at most one). Belongs to exactly one family tree.
- **Relationship**: A directed or paired connection between two individuals, typed as parent-child, spouse, or sibling. Used to derive the tree's visual structure; an individual may have multiple relationships of different types (e.g., multiple children, more than one spouse across time).
- **Family Tree**: A named collection of individuals and relationships. Attributes: name, default flag (at most one tree is default at a time), published flag (whether unauthenticated guests may view it). The system holds at most 5 family trees.
- **User Account**: A signed-in person interacting with the system, holding exactly one role: Admin, Editor, or Viewer, which determines what actions they may perform.
- **Guest**: An unauthenticated visitor with no user account. Can view a published tree exactly as a Viewer would (browse, expand/collapse, view individual details, export/print); has no create/edit/delete/import/tree-management capability under any circumstance.
- **Import Batch**: The result of a single spreadsheet import attempt into a specific family tree, including which rows succeeded, which failed and why, and which rows were flagged as likely duplicates (exact full name + date of birth match) pending manual review.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user sees the default family tree fully rendered within 3 seconds of opening the home page under normal network conditions.
- **SC-002**: A first-time Viewer can locate a specific relative's parents, spouse, and children within 30 seconds of opening the tree, using only expand/collapse and selection.
- **SC-003**: An Editor can add a new individual and link them into the tree with at least one relationship in under 2 minutes without external assistance.
- **SC-004**: Importing a spreadsheet of up to 200 individuals is fully processed, with a success/failure summary shown, in under 5 minutes.
- **SC-005**: In review/testing, 100% of attempted create, edit, delete, or import actions by a Viewer-role account are blocked.
- **SC-006**: An Admin can switch the default tree shown on the home page in under 1 minute.
- **SC-007**: Users report the tree's visuals (colors, text legibility) as comfortable to read for sessions of 10+ minutes, based on informal user feedback during acceptance review.
- **SC-008**: A user can generate a printable/exportable version of the currently displayed tree view in under 30 seconds.
- **SC-009**: An unauthenticated guest can open the home page and view a published tree's content within the same 3-second target as SC-001, without creating an account or signing in.

## Assumptions

- By default, access to any family tree's content requires signing in; Admin can opt a specific tree into public, unauthenticated viewing (FR-028) — this is expected to be the common case, since in practice only a few family members need accounts to manage the tree, while most only need to view it. All three roles (Admin, Editor, Viewer) are granted to specific signed-in accounts rather than self-registered; guests are not accounts at all.
- Admin accounts provision Editor and Viewer accounts (or approve access requests); open self-service sign-up is out of scope for this feature.
- Only one tree can be effectively guest-visible at a time in practice, because only the default tree is shown on the home page and guests have no UI to select a different tree; Admin may still mark a non-default tree published, but it has no guest-facing surface until it becomes the default.
- Gender is recorded using a small fixed set of values (e.g., Male, Female, Unknown) appropriate for genealogical records; no free-text gender field is required.
- Importing a spreadsheet adds to the existing content of the selected tree (merge/append) rather than replacing it outright. Duplicate detection (per FR-025) only flags exact full-name + date-of-birth matches for manual review; a full duplicate-resolution workflow (e.g., automatic merging of matched records, fuzzy matching) is out of scope for this feature.
- The predefined spreadsheet template (column layout and required fields) is defined and distributed as part of this feature but is not itself user-configurable.
- "Deleting" an individual or relationship removes it from the active tree; long-term audit history/undo of deletions is out of scope for this feature.
- Avatar photos are limited to common web image formats and a reasonable file size (exact format/size limits to be finalized during planning) to keep the tree performant.
- The 5-tree limit applies system-wide (total trees in the app), not per-user.
- Sibling relationships may be inferred from shared parent-child relationships, but the system also allows them to be recorded explicitly for cases where parents are not both known.
- The interface is Vietnamese-only for this feature; multi-language/localization support is out of scope.
- Export/print scope is basic: rendering the currently visible tree view (respecting its expand/collapse state) to an image or PDF file; advanced print layout customization (pagination, custom page sizing, selective branch export) is out of scope for this feature.
