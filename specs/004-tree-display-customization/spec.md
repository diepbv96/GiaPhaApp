# Feature Specification: Tree Display Customization — Card Status Styling & Background Color

**Feature Branch**: `004-tree-display-customization`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "add features to support below items: /  - allow viewer (anyone) change the background color for the specific or all family trees (store in session storage of browser). user can pick any color from color picker and save to set the background color. / - update family tree card to indicate the different between dead person and alive person via card border and background color. the gender should be indicate via border of avatar instead of border of the card as current."

## Clarifications

### Session 2026-07-20

- Q: When a visitor picks a color in the color picker (before clicking Save), should the tree's background update live as a preview, or only after they click Save? → A: Live preview, then Save persists — the canvas updates immediately as the visitor picks, and Save persists the already-visible color to session storage.
- Q: When a visitor uses the reset action (FR-010), what exactly does it reset? → A: Only the current tree's own setting — resets just the tree-specific override for the tree currently being viewed (falling back to the all-trees default if one is saved, otherwise the app default); a separate reset action clears the all-trees default itself.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tell Who's Living or Deceased at a Glance, and Gender From the Avatar (Priority: P1)

Today, every person's card in the family tree diagram shows a colored border around the *whole card* to indicate gender, and shows nothing at all to indicate whether that person is living or deceased — a visitor has to open each person's detail panel to find out. A visitor wants to see, just by glancing at the diagram, which people are deceased and which are living, and wants gender shown as a border around each person's avatar instead of around their whole card.

**Why this priority**: This is a pure visual-clarity improvement that benefits every visitor immediately with zero interaction required, and doesn't depend on anything else in this feature — it's the more foundational of the two changes.

**Independent Test**: Open any family tree with at least one deceased and one living person; confirm their cards are visually distinguishable as deceased vs. living without opening either one's detail panel; confirm each card's gender indicator now appears as a border around the avatar image, not around the card.

**Acceptance Scenarios**:

1. **Given** a living person's card, **When** the tree diagram renders, **Then** that card's border and background use the "living" visual treatment.
2. **Given** a deceased person's card, **When** the tree diagram renders, **Then** that card's border and background use a treatment clearly distinguishable from the "living" treatment.
3. **Given** any person's card, **When** the tree diagram renders, **Then** the gender indicator (male/female/unknown) appears as a border around that person's avatar image, not around the outer edge of the card.
4. **Given** a person whose card previously showed a gender-colored card border, **When** this change is in place, **Then** the same gender-color distinction is still visible, just relocated to the avatar's border.
5. **Given** any person's card, **When** the tree diagram renders, **Then** all other existing card content and behavior (name, sibling-order badge, expand/collapse control, click-to-select) is unchanged.

---

### User Story 2 - Personalize the Tree's Background Color for This Browser Session (Priority: P2)

A visitor — signed in or not — wants to pick their own background color for the family tree diagram, either just for the tree they're currently looking at or as a default for every tree they view, without needing an account setting or affecting what anyone else sees.

**Why this priority**: An opt-in personalization layered on top of the diagram; valuable but only to visitors who choose to use it, and fully independent of the card-styling change above.

**Independent Test**: Open any family tree, use the background color control to pick and save a custom color for that tree, confirm it takes effect immediately and again after reloading the page (same browser session); confirm a different browser/session never sees this choice.

**Acceptance Scenarios**:

1. **Given** a visitor (signed in or a guest) is viewing any family tree they're already allowed to see, **When** they open the background color control, **Then** they can pick any color from a color picker.
2. **Given** a visitor is actively picking a color in the color picker, **When** they move the picker's selection (before saving), **Then** the tree's background updates live to preview that color.
3. **Given** a visitor picks a color and saves it as specific to the tree they're currently viewing, **When** they reload the page or revisit that same tree later in the same browser session, **Then** that tree's diagram shows the saved color.
4. **Given** a visitor picks a color and saves it as the default for all family trees, **When** they view any other tree in the same browser session, **Then** that tree's diagram also shows that color — unless that other tree already has its own tree-specific saved color, which takes precedence.
5. **Given** a visitor has saved a background color choice, **When** they close their browser (ending the session) and return later, **Then** the diagram shows the application's original default background again — the choice does not carry over to a new session.
6. **Given** a visitor has made no background color choice, **When** they view any tree, **Then** the diagram shows the application's existing default background, unchanged from today.
7. **Given** a visitor has saved a tree-specific color for the tree they're viewing, **When** they use that tree's reset action, **Then** only that tree's own saved color is cleared — the tree falls back to the all-trees default if one is saved, or the application default otherwise — and any other tree's saved color is unaffected.
8. **Given** a visitor has saved an all-trees default color, **When** they use the separate reset action for the all-trees default, **Then** the all-trees default is cleared and every tree without its own tree-specific color reverts to the application default.
9. **Given** two visitors in two different browser sessions both customize backgrounds, **When** either one views a tree, **Then** neither one's choice is visible to, or affects, the other.

---

### Edge Cases

- What happens if a visitor picks a background color similar to a card's "living" or "deceased" background treatment? Cards must remain distinguishable primarily via their border, not solely their background fill, so a card's living/deceased status stays legible regardless of which background color a visitor has chosen.
- What happens across multiple browser tabs open at once? A saved background choice is shared across tabs in the same browser session (standard per-origin session behavior), so both tabs reflect the same choice.
- What happens when exporting/printing the current tree view (existing feature)? It continues to capture whatever is currently on screen, including any custom background color in effect — no separate export mode is introduced.
- What happens to a person whose gender is recorded as "unknown"? Their avatar border still shows the existing neutral/unknown-gender treatment — only its position (avatar vs. card) changes, not its meaning.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST visually distinguish a deceased person's card from a living person's card using both the card's border and its background, not just one of the two.
- **FR-002**: System MUST show each person's gender (male/female/unknown) as a border around their avatar image, and MUST NOT show it as a border around the card itself.
- **FR-003**: System MUST preserve every other existing element and behavior of a person's card (name, sibling-order badge, expand/collapse control, selection) unchanged by this restyling.
- **FR-004**: System MUST allow any visitor — signed in or not — to open a control that lets them pick a background color, from a full color picker (not a fixed preset list), for the family tree diagram.
- **FR-005**: System MUST let a visitor save a chosen background color as specific to the family tree they are currently viewing.
- **FR-006**: System MUST let a visitor save a chosen background color as a default applied to every family tree they view.
- **FR-007**: When both a tree-specific color and an all-trees default are saved, system MUST apply the tree-specific color for that tree and the all-trees default for every other tree.
- **FR-008**: System MUST store a visitor's background color choice(s) only in that browser's session storage — never on a server, never associated with a user account, and never visible to any other visitor.
- **FR-009**: System MUST discard all saved background color choices when the browser session ends, reverting every tree to the application's default background the next time it's opened in a new session.
- **FR-010**: System MUST provide a reset action scoped to the tree currently being viewed that clears only that tree's own saved color (falling back to the all-trees default if one exists, otherwise the application default), and a separate reset action that clears the all-trees default itself — neither requires the visitor to end their browser session.
- **FR-011**: System MUST preview a visitor's color-picker selection on the tree's background live, as they pick, and MUST apply a saved color choice immediately — neither the live preview nor the saved choice requires a page reload.
- **FR-012**: This feature MUST NOT change which family trees, or which people within a tree, any visitor is allowed to see — it only changes how an already-visible tree is displayed.

### Key Entities

- **Person Card (existing concept, restyled)**: The visual representation of an individual in the tree diagram. Its border and background now communicate living-vs-deceased status (from the person's existing recorded status); its avatar's border now communicates gender (from the person's existing recorded gender). No new data field is introduced — both signals already exist on the person's record today.
- **Background Color Preference (new, client-local only)**: A visitor's chosen color, optionally scoped to one specific family tree or to all trees as a default, held only in the visitor's current browser session — never persisted to any shared or durable store, never tied to a user account, and gone once that browser session ends.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can correctly identify whether a person is living or deceased just by looking at their card, without opening the detail panel, 100% of the time the underlying data is known.
- **SC-002**: A visitor can correctly identify a person's gender by looking only at their avatar, without needing any other part of the card, 100% of the time.
- **SC-003**: A visitor can pick, save, and see a custom background color applied to the current tree in under 30 seconds, with no page reload required.
- **SC-004**: A saved background color choice is never visible to, or shared with, any other visitor, and never remains after the browser session in which it was chosen ends.
- **SC-005**: Choosing an all-trees default background is reflected the next time the visitor opens any tree that doesn't already have its own tree-specific choice, with zero additional steps per tree.

## Assumptions

- "Dead person and alive person" refers to the existing `isDeceased` status already recorded per individual; no new data is introduced for this feature.
- "Gender" refers to the existing three recorded categories (male/female/unknown); only where that signal is drawn (avatar border instead of card border) changes.
- "Session storage of browser" is taken literally: the choice is scoped to the current browser session and is expected to disappear once that session ends (e.g., the browser or tab is closed) — this is a deliberate, ephemeral, per-browser preference, not a durable, cross-device, or account-linked setting.
- "Viewer (anyone)" means this control is available to every visitor regardless of role or sign-in state, but only for trees that visitor is already permitted to view under the app's existing access rules — this feature changes nothing about who can see which tree.
- Exact color values for the "living" vs. "deceased" card treatment, and for the gender-on-avatar border, are a visual design decision left to the planning/implementation phase; this spec only requires that the two states (and the three gender categories) remain clearly, independently distinguishable.
- A "reset to default" action is included alongside "save" so a visitor isn't forced to close their browser just to undo a background color choice.
