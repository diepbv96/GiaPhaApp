# Feature Specification: Cascade-Hide In-Law-Only Relatives

**Feature Branch**: `010-hide-inlaw-relatives`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "enhance feature to allow below item: - Khi ẩn dâu/rễ được enable, sẽ ẩn luôn cả những relationship của dâu/rễ (ví dụ con riêng của dâu/rễ)" (When "hide in-laws" is enabled, also hide all of the in-law's own relationships — e.g. an in-law's own children from outside the family)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Married-In Relative's Own Family Disappears Too (Priority: P1)

Today, turning on "Ẩn dâu/rễ" (hide in-laws) removes each in-law (the spouse who married into the family) from the diagram, but anyone connected to the tree *only* through that in-law — such as a child that in-law had before joining the family, or that child's own descendants — is left behind on the canvas with no visible connection to anyone, because the one relationship that placed them there (their link to the now-hidden in-law) was removed along with the in-law. A viewer wants those leftover relatives to disappear along with the in-law that was the only reason they appeared at all, so the "hide in-laws" view is genuinely limited to blood relatives and the people who married into the family, with no orphaned leftovers.

**Why this priority**: This is the entire point of the enhancement — without it, the existing "hide in-laws" toggle leaves a visibly broken result (disconnected cards floating with no relationship lines), which is worse than not hiding anything, since it looks like a display bug rather than an intentional filter.

**Independent Test**: In a tree where an in-law has a child recorded from outside the family's blood line (not shared with their blood-relative spouse), enable "Ẩn dâu/rễ" and confirm that in-law's child (and that child's own descendants, if any) are no longer shown, exactly as if they were never part of the tree.

**Acceptance Scenarios**:

1. **Given** an in-law who has a child that is not also the child of their blood-relative spouse, **When** a viewer enables "Ẩn dâu/rễ", **Then** that child is hidden from the diagram along with the in-law.
2. **Given** that same hidden child has their own children (grandchildren of the in-law, exclusively descended through the in-law's side), **When** "Ẩn dâu/rễ" is enabled, **Then** those descendants are also hidden.
3. **Given** an in-law's child who is also the recorded child of the in-law's blood-relative spouse (a shared child — a genuine blood descendant of the family), **When** "Ẩn dâu/rễ" is enabled, **Then** that shared child remains visible, unaffected by this change.
4. **Given** any relative hidden by this cascading rule, **When** a viewer disables "Ẩn dâu/rễ", **Then** that relative and all of their relationships reappear exactly as they were before the toggle was ever turned on — hiding is purely visual and reversible, never a data change.
5. **Given** the "Ẩn dâu/rễ" toggle is off, **When** the tree diagram renders, **Then** in-laws and everyone connected to them display exactly as they do today — this feature changes nothing about the toggled-off state.

---

### Edge Cases

- What happens to a relative who has no recorded parent at all but is only linked into the tree via a sibling relationship to an in-law's exclusive child (no parent_child link of their own)? This cascade follows parent-child ancestry only, so a relative with no recorded parent is treated like any other individual with no recorded parent (the same rule that already keeps founders visible) and is not additionally hidden by this feature. If removing their sibling leaves them with no remaining relationship at all, they display using the existing "isolated individual" indicator (spec 008) rather than disappearing — an intentional, already-visible state, not a dangling/broken-looking card.
- What happens to an individual who is genuinely unrelated to anyone (zero relationships in the underlying data, unrelated to any in-law)? They are unaffected by this feature and continue to display using the existing "isolated individual" indicator, unchanged.
- What happens if hiding an in-law's exclusive child would also hide that child's spouse (a second in-law, married into the in-law's own side rather than the main family)? That spouse is already hidden today as an in-law in their own right (they have no recorded parent), so no new behavior is needed for them specifically — but it confirms the cascade doesn't need to special-case "in-laws of in-laws."
- What happens to a root-generation founder couple (neither spouse has a recorded parent)? They remain visible exactly as today — this feature only changes what happens to relatives who become disconnected as a *result* of hiding an in-law; it never changes who counts as an in-law in the first place.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When "Ẩn dâu/rễ" is enabled, the system MUST hide not only each in-law but also every relative who has no recorded parent-child ancestry path back to a blood-relative member of the tree that avoids passing through a now-hidden in-law — i.e., anyone whose only recorded parent (or chain of parents) traces back exclusively to a now-hidden in-law.
- **FR-002**: The system MUST keep visible any relative who has at least one recorded parent-child ancestry path back to a blood-relative member that avoids every now-hidden in-law (e.g., a child shared between an in-law and their blood-relative spouse, via that blood-relative parent), regardless of how many other ancestry paths that same relative also has through now-hidden in-laws.
- **FR-003**: The system MUST apply this cascading removal transitively down the ancestry chain — a relative hidden by this rule causes any of their own recorded children to be hidden as well (unless that child has another qualifying ancestry path per FR-002), and so on for as many generations as the data records.
- **FR-004**: The system MUST NOT change what counts as an "in-law" — the existing definition (a spouse with no recorded parent, married to someone who has one) is unchanged; this feature only extends what else gets hidden as a consequence.
- **FR-005**: The system MUST leave the diagram exactly as it is today whenever "Ẩn dâu/rễ" is turned off — this feature has no effect on the toggled-off state.
- **FR-006**: This feature MUST NOT delete, modify, or otherwise alter any underlying individual or relationship record — hiding is a display-only effect that fully reverses the moment the toggle is turned off.
- **FR-007**: The system MUST continue to apply the existing "isolated individual" display treatment to any individual who is not hidden by this feature but ends up with zero remaining relationships once in-laws and their exclusive descendants are hidden (e.g., a relative with no recorded parent who was only otherwise linked to a now-hidden individual through a non-ancestry relationship) — such a relative remains visible with that existing indicator rather than being additionally hidden or left looking disconnected.

### Key Entities

- **In-Law (existing concept, unchanged)**: A spouse with no recorded parent, married to someone who has one; already hidden by the existing toggle.
- **In-Law-Only Relative (new concept)**: Anyone whose recorded parent-child ancestry traces back exclusively to a now-hidden in-law, with no alternate ancestry path to a blood-relative member — for example, an in-law's child from outside the family, or that child's own descendants. Newly hidden by this feature whenever "Ẩn dâu/rễ" is enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With "Ẩn dâu/rễ" enabled on a tree containing an in-law's exclusive children or further descendants, none of those relatives appear on the diagram, and zero disconnected/dangling cards remain as a result of the toggle.
- **SC-002**: Every blood-relative descendant continues to appear when "Ẩn dâu/rễ" is enabled, even when that descendant is also, through a different parent, connected to a now-hidden in-law.
- **SC-003**: Turning "Ẩn dâu/rễ" off restores 100% of previously-hidden relatives and their relationships with no data loss and no page reload required.

## Assumptions

- "Con riêng của dâu/rễ" (an in-law's exclusive child) is understood as a child recorded for the in-law who is not also recorded as the child of that in-law's blood-relative spouse — i.e., not a shared/blood descendant of the family.
- This enhancement builds on the existing "Ẩn dâu/rễ" toggle (spec 003) and the existing in-law filtering behavior; it does not introduce a new toggle or setting.
- This enhancement follows recorded parent-child ancestry only; it does not attempt to hide a relative purely because their only remaining relationship is a `sibling` or `spouse` link to an already-hidden individual when that relative has no recorded parent of their own. Such a case is expected to be rare in practice (siblings are normally recorded together with a shared parent) and is left visible under the existing "isolated individual" treatment (FR-007) rather than the ancestry cascade, so the tree never silently loses someone this feature cannot yet make a confident, unambiguous ancestry judgment about.
- No new data field or relationship type is required; the cascade is derived entirely from existing `parent_child` relationships already recorded (the same relationships the existing in-law rule and family-relations display already read).
