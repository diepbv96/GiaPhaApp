# Feature Specification: Cross-Tree Relationship Visibility

**Feature Branch**: `009-cross-tree-relationships`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "when two individuals already have a relationship (e.g. wife/husband) recorded in family tree 1, and an admin/editor later adds both of them as members of family tree 2, their existing relationship must also be visible/remain in family tree 2 (not just tree 1). Currently relationships are only displayed in the single family tree the relationship row was originally created in, even if both individuals are now members of another tree."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Relationship follows both members into a new shared tree (Priority: P1)

An admin/editor has already recorded that individual A and individual B are wife and husband inside family tree 1. Later, the admin/editor adds both A and B as members of family tree 2 (e.g. because both belong to a broader lineage tree as well). When the admin/editor opens family tree 2, they expect to immediately see A and B connected by their existing wife/husband relationship, without having to recreate it.

**Why this priority**: This is the exact gap reported: relationships silently disappear when viewing a second tree that two already-related people both belong to, making the second tree look wrong (both people appear unrelated) and forcing manual, error-prone recreation of relationship data that already exists.

**Independent Test**: Create two individuals in tree 1, record a relationship between them, add both as members of tree 2, and open tree 2 — the relationship must appear on tree 2's canvas without any additional action.

**Acceptance Scenarios**:

1. **Given** individuals A and B have a recorded relationship and both are members only of family tree 1, **When** an admin/editor adds both A and B as members of family tree 2, **Then** opening family tree 2 shows A and B connected by that same relationship.
2. **Given** A and B's relationship is now visible in both family tree 1 and family tree 2, **When** the admin/editor opens family tree 1 again, **Then** the relationship is still shown there exactly as before (visibility in the new tree does not remove it from the original one).

---

### User Story 2 - Relationship stays hidden when only one party shares the tree (Priority: P2)

An admin/editor adds individual A (who has a relationship with B in tree 1) to family tree 2, but does not add B to family tree 2. The admin/editor expects family tree 2 to show A on their own (per existing isolated-individual display behavior) without any relationship line to B, since B is not part of family tree 2.

**Why this priority**: Prevents the fix for User Story 1 from over-showing relationships to people who aren't actually part of the tree being viewed, which would leak relationship context across unrelated trees and confuse admins/editors about who really belongs where.

**Independent Test**: Add only one of two already-related individuals to a second tree and confirm the relationship does not appear in that tree, while the individual still appears (isolated) per existing behavior.

**Acceptance Scenarios**:

1. **Given** A and B have a recorded relationship and only A is added to family tree 2, **When** the admin/editor opens family tree 2, **Then** A appears in family tree 2 without any relationship line to B.
2. **Given** the same setup, **When** the admin/editor later also adds B to family tree 2, **Then** the relationship between A and B immediately becomes visible in family tree 2.

---

### User Story 3 - Removing a shared membership doesn't destroy the relationship elsewhere (Priority: P3)

An admin/editor removes individual A's membership from family tree 2 (A remains a member of family tree 1, where the relationship with B was originally recorded and where B also remains a member). The admin/editor expects the relationship between A and B to remain completely intact in family tree 1, since neither A nor B's relationship data was actually tied to family tree 2.

**Why this priority**: Confirms that fixing cross-tree visibility doesn't introduce a new way to accidentally lose relationship data when someone's membership in one of several shared trees changes — a lower-priority safety check rather than the core visibility fix itself.

**Independent Test**: With A and B sharing both tree 1 (where the relationship was recorded) and tree 2 (added later), remove A's membership from tree 2 only, then confirm the relationship between A and B is still shown in tree 1.

**Acceptance Scenarios**:

1. **Given** A and B are both members of tree 1 and tree 2, with their relationship originally recorded in tree 1, **When** the admin/editor removes A's membership from tree 2 only, **Then** family tree 1 still shows the relationship between A and B unchanged.
2. **Given** the same removal, **When** the admin/editor opens family tree 2, **Then** A no longer appears there at all (consistent with existing membership-removal behavior), and no relationship data is reported as lost or broken.

---

### Edge Cases

- What happens if an admin/editor deletes the relationship between A and B while viewing family tree 2 (a tree they share only because both were added there after the relationship was created in tree 1)? The relationship must be deleted everywhere it was visible (tree 1 and tree 2 alike), since it is one shared piece of information about A and B, not a separate copy per tree.
- What happens if an admin/editor tries to create a new relationship of the same type between A and B directly inside family tree 2, not realizing they already have one from tree 1? The system must recognize this as the existing relationship (already covered by current duplicate-prevention behavior) rather than silently creating a second, conflicting record.
- What happens when A and B are both members of three or more family trees at once? The relationship must be visible in all of them simultaneously, not just two.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a relationship between two individuals in every family tree where both individuals are currently members, regardless of which family tree the relationship was originally recorded in.
- **FR-002**: System MUST NOT require an admin/editor to manually recreate a relationship when both individuals it connects become co-members of another family tree — visibility in the new tree must happen automatically as soon as both are members.
- **FR-003**: System MUST continue to treat a relationship between a given pair of individuals as a single shared record rather than a separate copy per family tree (consistent with existing duplicate-relationship prevention).
- **FR-004**: System MUST NOT display a relationship in a given family tree when at least one of the two individuals it connects is not currently a member of that family tree.
- **FR-005**: Deleting a relationship MUST remove it from every family tree it was visible in, not only the family tree the admin/editor happened to be viewing at the time.
- **FR-006**: Removing an individual's membership from one family tree MUST NOT delete, hide, or otherwise affect a relationship that remains valid in another family tree the individual still belongs to.
- **FR-007**: System MUST continue to allow creating a relationship only between two individuals who are both already members of the family tree in which the relationship is being created (unchanged from existing behavior).

### Key Entities

- **Relationship**: A connection (e.g. spouse, parent-child) between exactly two individuals. Existing behavior already treats a given pairing as a single record per relationship type; this feature changes only where that single record is *displayed* — in every family tree both connected individuals currently belong to — not how many records exist.
- **Individual Tree Membership**: The existing record of which family tree(s) an individual belongs to. This feature makes relationship visibility derive from this same membership data (already used to decide which individuals appear in a tree) instead of from the relationship's own originating tree.
- **Family Tree**: Unchanged; remains the container whose canvas displays a filtered set of individuals and relationships based on membership.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of relationships between two individuals who are both members of a given family tree are visible on that tree's canvas, regardless of which tree the relationship was originally recorded in.
- **SC-002**: Admins/editors never need to manually recreate a relationship after adding both connected individuals to an additional family tree — zero duplicate relationship records are created for the same pair as a side effect of this feature.
- **SC-003**: Removing an individual from one family tree they share with a relationship partner does not affect the same relationship's visibility in any other family tree they remain a member of, in 100% of cases.

## Assumptions

- A relationship's "originating" family tree (the one recorded on the relationship itself) remains meaningful only as historical/creation context; it no longer determines display, since display is now membership-based like individuals already are (spec 006, spec 008).
- This feature does not change how relationships are created (both individuals must already be members of the tree they're being connected in, FR-007) — only how an already-existing relationship is displayed once tree memberships change afterward.
- Guest/public viewers are subject to the same visibility rule as admins/editors: a relationship is visible on a public tree's canvas only when both connected individuals are members of that specific tree.
