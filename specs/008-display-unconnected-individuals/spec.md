# Feature Specification: Display Individuals Without Relationships in Their Family Trees

**Feature Branch**: `008-display-unconnected-individuals`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "individual A and B is wife and husband and exist in family tree 1, then admin create family tree 2 and add both A and B to family tree 2. expect A and B must be display in family tree 2 as well. every individual in a family tree should be displayed in that family tree even when they don't have any relationship. it help admin and editor can aware and add relationship or delete that individual."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A tree member with no relationships still appears in that tree (Priority: P1)

Individuals A and B are a married couple with a full set of relationships in Family Tree 1. An admin creates Family Tree 2 and adds both A and B to it as members, but has not yet defined any relationship for either of them within Family Tree 2. When anyone opens Family Tree 2's view, A and B must appear there too — not just in Family Tree 1 — even though neither has a relationship recorded in Family Tree 2 yet.

**Why this priority**: This is the core problem being fixed. Today, an individual with zero relationships in a given tree is silently left out of that tree's view, which means admins/editors have no way to notice — from the tree view — that A and B were even added to Family Tree 2. This undermines the multi-tree membership capability and can make added individuals appear to have "disappeared."

**Independent Test**: Can be fully tested by adding an existing individual (with relationships in one tree) to a second tree without creating any relationship for them there, then opening the second tree's view and confirming that individual is visible.

**Acceptance Scenarios**:

1. **Given** individuals A and B have a spouse relationship in Family Tree 1, **When** an admin adds both A and B as members of Family Tree 2 without creating any relationship for them in Family Tree 2, **Then** A and B both appear in Family Tree 2's view.
2. **Given** A and B are now visible in Family Tree 2 with no relationships there, **When** anyone views Family Tree 1, **Then** A and B still appear there with their existing spouse relationship, unaffected by their membership in Family Tree 2.
3. **Given** a brand-new individual is created directly within a tree and no relationship has been defined for them yet, **When** anyone opens that tree's view, **Then** the new individual appears in the view (rather than being hidden until a relationship exists).
4. **Given** an admin/editor removes the only relationship an individual has within a tree (e.g., deletes their one recorded relationship), **When** they view that tree afterward, **Then** the individual still appears in the view instead of disappearing.

---

### User Story 2 - Notice and act on a tree member with no relationships (Priority: P2)

An admin or editor viewing a family tree notices someone displayed without any connection to the rest of the tree. They need to be able to tell at a glance that this person currently has no relationships in this tree, and then either add a relationship for them or delete them, directly from that view.

**Why this priority**: Simply showing the individual (User Story 1) already solves the "disappearing person" problem. This story adds the follow-up capability — noticing and acting on it — which is the actual reason visibility matters, but it depends on User Story 1 being in place first.

**Independent Test**: Can be fully tested by opening a tree that contains an individual with zero relationships, confirming they are visually distinguishable from connected individuals, then selecting them and successfully using the existing add-relationship action or the existing delete action on them.

**Acceptance Scenarios**:

1. **Given** a tree view containing both connected individuals and an individual with zero relationships in that tree, **When** an admin/editor looks at the view, **Then** they can visually tell which individual has no relationships in that tree, distinct from those who are part of a connected family unit.
2. **Given** an admin/editor selects an individual who has zero relationships in the current tree, **When** they choose to add a relationship, **Then** the same relationship-adding capability available for any other individual in that tree opens and works as expected.
3. **Given** an admin/editor selects an individual who has zero relationships in the current tree, **When** they choose to delete that individual, **Then** the same delete capability available for any other individual works as expected.
4. **Given** a viewer (read-only user), **When** they view a tree containing an individual with zero relationships, **Then** they can see that individual but have no add-relationship or delete controls available, consistent with their existing read-only access to every other individual.

---

### Edge Cases

- What happens when a tree contains several individuals who each have zero relationships in that tree, and none of them are related to each other? Each must be displayed as its own separate, unconnected individual — they must not be grouped or connected to one another just because they share the "no relationship" state.
- What happens when an individual belongs to several family trees and has zero relationships in more than one of them? The individual must still appear, independently, in every tree they are a member of, regardless of how many of those trees currently have no relationship recorded for them.
- What happens when a tree has a large number of individuals with zero relationships at once? The view must remain readable and usable rather than becoming cluttered to the point that the connected family structure is hard to follow.
- What happens when an individual has relationships in one tree but is newly added, with zero relationships, to a second tree? Their relationships and display in the first tree must be completely unaffected by their unconnected status in the second.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display every individual who is a member of a family tree within that tree's view, regardless of whether they currently have any relationship recorded within that specific tree.
- **FR-002**: System MUST NOT omit or hide a tree member from that tree's view solely because they have zero relationships in that tree.
- **FR-003**: When an individual is added as a member of a family tree — including a tree they did not previously belong to — System MUST make that individual visible in that tree's view immediately, without requiring any relationship to be created for them first.
- **FR-004**: When an admin/editor removes an individual's last remaining relationship within a tree, System MUST continue to display that individual in that tree's view afterward, rather than removing them from the view.
- **FR-005**: System MUST visually distinguish, within a tree's view, individuals who currently have zero relationships in that tree from individuals who are part of a connected family unit.
- **FR-006**: System MUST allow an admin/editor to select an individual with zero relationships directly from the tree view and access the same add-relationship action available for any other individual in that tree.
- **FR-007**: System MUST allow an admin/editor to select an individual with zero relationships directly from the tree view and access the same delete action available for any other individual in that tree.
- **FR-008**: This display behavior MUST apply consistently no matter how many other family trees the individual also belongs to, or how many relationships they have within those other trees.
- **FR-009**: Viewers (read-only users) MUST be able to see individuals with zero relationships in a tree's view under the same visibility rules as any other individual in that tree, without gaining any edit or delete capability beyond what they already have.

### Key Entities

- **Individual**: A person who may belong to one or more family trees; may have zero, one, or more relationships within any given tree they belong to. Must always be shown in every tree they are a member of, independent of relationship count in that tree.
- **Family Tree**: A named collection of individuals and their relationships; its view must reflect all of its members, connected or not.
- **Individual–Family Tree Membership**: The association that determines which trees an individual appears in; membership alone (not relationship count) governs visibility in a tree's view.
- **Relationship**: A connection between two individuals within a specific family tree; its presence or absence for an individual affects only their visual grouping within the view, not whether they are shown at all.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of individuals who are members of a family tree appear in that tree's view, including every individual with zero relationships in that tree.
- **SC-002**: When an admin/editor adds an existing individual to a new family tree, that individual is visible in the new tree's view the next time the view is opened, with no relationship required beforehand.
- **SC-003**: Admins/editors can identify individuals with zero relationships directly within the tree view itself, without needing to cross-reference a separate list or report.
- **SC-004**: Admins/editors can add a relationship for, or delete, an individual with zero relationships directly from the tree view, in the same number of steps it takes for any other individual in that tree.

## Assumptions

- This supersedes the prior behavior in which a newly created individual with no relationships was not shown in the tree view; going forward, tree membership alone determines visibility, regardless of relationship count.
- Individuals with zero relationships are displayed using the same node style as any other individual, positioned as their own independent unit within the view (not attached to any family group), with an added visual cue (e.g., a distinct marker or styling) to make them easy to notice — the precise visual design is left to be worked out during planning.
- No new relationship-adding or deletion capability is being introduced by this feature; it only ensures these individuals are visible in the tree view so that the add-relationship and delete actions already available for any individual become reachable for them too.
- How the view lays out a large number of simultaneous zero-relationship individuals (spacing, grouping, pagination, etc.) is an implementation decision to be resolved during planning, as long as the view remains usable.
