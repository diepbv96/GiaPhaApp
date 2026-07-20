# Quickstart: Tree Display Customization

Prerequisites: dev server running (`npm run dev`), signed out or signed in — every scenario below works for a guest unless noted. Uses the seeded default tree and its seeded individuals (e.g. "Bùi Văn Cha", deceased; pick any living seeded individual for contrast).

## User Story 1 — Living/deceased + gender-on-avatar (P1)

1. Open the app; locate a deceased individual's card (e.g. "Bùi Văn Cha") and a living individual's card.
   - **Expect**: their border + background are visibly different from each other (`contracts/person-card-styling.md`).
2. Look at either card's avatar circle.
   - **Expect**: a colored border around the avatar matching the individual's gender (blue/male, pink/female, grey/unknown) — the card's outer border is now the living/deceased indicator, not a gender color.
3. Confirm name, sibling-order badge (if present), expand/collapse button, and click-to-select still work exactly as before (FR-003).

## User Story 2 — Background color preference (P2)

1. Open any family tree (as guest or signed in). In the sidebar's "Hiển thị" section, open "Màu nền".
2. Drag inside the color picker without clicking any save button.
   - **Expect**: the tree canvas background updates live as you drag (Clarifications Q1).
3. Click "Lưu cho cây này".
   - **Expect**: color persists; reload the page (same tab) — the color is still applied to this tree.
4. Navigate to a *different* family tree (no tree-specific color saved for it).
   - **Expect**: it shows the app's original default background, unaffected by step 3.
5. Return to the tree from step 3–4, open "Màu nền" again, pick a new color, click "Lưu cho tất cả cây" instead.
   - **Expect**: this tree still shows its own tree-specific color from step 3 (tree-specific overrides all-trees default — FR-007), *not* the new all-trees color.
6. Open the other tree from step 4.
   - **Expect**: it now shows the all-trees default color from step 5.
7. Back on the tree-specific tree, click "Đặt lại màu cây này".
   - **Expect**: it now shows the all-trees default color too (falls back per FR-007/FR-010), not the original app default.
8. Click "Đặt lại mặc định chung" (on either tree).
   - **Expect**: both trees revert to the app's original default background.
9. Open the app in a new private/incognito window (a fresh session).
   - **Expect**: no saved color choice from steps 1–8 is visible there (FR-008/FR-009/SC-004).
10. Export the current view (existing export button) while a custom color is applied.
    - **Expect**: the exported image/PDF shows that custom background, not the app default (Edge Cases).
