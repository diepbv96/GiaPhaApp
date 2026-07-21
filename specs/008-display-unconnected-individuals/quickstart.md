# Quickstart: Display Individuals Without Relationships in Their Family Trees

Prerequisites: dev server running (`npm run dev`), signed in as the seeded admin (`admin@giapha.test` / `GiaPha!Test123`, from `supabase/seed/seed.sql`). Uses both seeded trees: "Gia Phả Dòng Họ Bùi (Mẫu)" (default — "Bùi Văn Tổ", "Trần Thị Tổ Mẫu" as spouses, "Bùi Văn Cha" their child) and "Gia Phả Chi Nhánh Miền Nam (Mẫu)" ("Bùi Thị Út", zero relationships there today).

## User Story 1 — A tree member with no relationships still appears in that tree (P1)

1. Open the second tree ("Gia Phả Chi Nhánh Miền Nam (Mẫu)").
   - **Expect**: "Bùi Thị Út" is visible on the canvas even though she has zero relationships in this tree (this already works today via `getTreeGraph`'s membership-based query — confirms the data layer was never the problem).
2. As admin, open the default tree, select "Bùi Văn Cha", use "Thêm vào cây gia phả khác" to add him to the second tree, then navigate there.
   - **Expect**: "Bùi Văn Cha" now appears in the second tree's canvas, unconnected to "Bùi Thị Út" or anyone else there (User Story 1 acceptance scenario 1) — before this feature, he would have been silently missing.
3. Go back to the default tree.
   - **Expect**: his spouse/parent relationships there are unaffected — still shown exactly as before (acceptance scenario 2).
4. Create a brand-new individual directly in the second tree via the usual "add individual" action, without creating any relationship for them.
   - **Expect**: the new individual appears on the canvas immediately (acceptance scenario 3) — this is the case spec 001 originally excluded; confirm it's now included.
5. In the default tree, delete the "Bùi Văn Cha" → parent relationship (his only relationship there, temporarily, for this test) via his detail panel's existing delete-relationship control, then look at the canvas again.
   - **Expect**: he remains visible on the canvas, now as an isolated node, rather than disappearing (acceptance scenario 4). Restore the relationship afterward (cleanup).

## User Story 2 — Notice and act on a tree member with no relationships (P2)

1. On the second tree's canvas (containing both a connected individual, if any, and an isolated one like "Bùi Văn Cha" from above), look at the isolated individual's card.
   - **Expect**: it is visually distinguishable from a connected individual's card (e.g. dashed border / badge) (acceptance scenario 1).
2. Click the isolated individual's card.
   - **Expect**: the detail panel opens, showing "Chưa rõ" (unknown/none) for every relationship category.
3. Use "Thêm mối quan hệ" from the panel to link the isolated individual to "Bùi Thị Út" in this tree.
   - **Expect**: the relationship is created successfully, and the isolated visual marker disappears from that individual's card on the next render (since they're no longer isolated in this tree).
4. Remove that same individual from the second tree (undo, via "Xoá khỏi cây này") to restore fixture state, then verify he's still intact and connected in the default tree.
5. As admin, select an isolated individual and use "Xoá cá thể" instead of adding a relationship.
   - **Expect**: the existing delete confirmation and flow work identically to deleting any other individual.
6. Sign in as `viewer@giapha.test`, view a tree containing an isolated individual.
   - **Expect**: the individual is visible with the isolated marker, but no add-relationship/delete controls are available (acceptance scenario 4).

## Cleanup

Restore any relationships/memberships removed during testing (steps 5 of US1 and steps 3-4 of US2) or reset from `supabase/seed/seed.sql` / a pre-test snapshot.
