# Quickstart: Family Tree Naming, Multi-Tree Membership & Relationship Management

Prerequisites: dev server running (`npm run dev`), signed in as the seeded admin (`admin@giapha.test` / `GiaPha!Test123`, from `supabase/seed/seed.sql`). Uses both seeded trees: "Gia Phả Dòng Họ Bùi (Mẫu)" (default, public — "Bùi Văn Tổ", "Trần Thị Tổ Mẫu", "Bùi Văn Cha") and "Gia Phả Chi Nhánh Miền Nam (Mẫu)" (non-default, public — "Bùi Thị Út").

## User Story 1 — Manage a person's relationships within one family tree (P1)

1. Open the default tree, select "Bùi Văn Cha", click "Thêm mối quan hệ".
   - **Expect**: the person-selection dropdown lists only "Bùi Văn Tổ" and "Trần Thị Tổ Mẫu" (his existing parents) — never "Bùi Thị Út", who belongs only to the other tree (`contracts/relationship-management.md`).
2. Open "Bùi Văn Tổ"'s detail panel, expand "Gia đình".
   - **Expect**: each relative row (his spouse "Trần Thị Tổ Mẫu", his child "Bùi Văn Cha") now has edit and delete controls, since you're signed in as admin.
3. Click "Sửa" on the spouse row and change the type... (spouse/sibling/parent_child are mutually exclusive concepts here — instead, click "Sửa" on the "Bùi Văn Cha" child row and confirm the type picker offers only valid alternatives, then cancel without changing it, since he genuinely is a `parent_child`).
   - **Expect**: the picker opens pre-set to the current type; canceling leaves the relationship unchanged.
4. Click "Xoá" on that same row, confirm.
   - **Expect**: the relationship disappears from both "Bùi Văn Tổ"'s and "Bùi Văn Cha"'s family lists immediately; the tree canvas no longer draws that edge.
5. Undo by re-adding the same parent/child relationship via "Thêm mối quan hệ" so the fixture is back to its seeded state for the next story.
6. Sign in as `viewer@giapha.test` instead and repeat step 2.
   - **Expect**: relatives are listed but no edit/delete controls are shown (FR-015).

## User Story 2 — Assign a person to more than one family tree (P2)

1. As admin, open the default tree, select "Bùi Văn Cha", click the new "Thêm vào cây gia phả khác" action.
   - **Expect**: the dialog offers only "Gia Phả Chi Nhánh Miền Nam (Mẫu)" as an add-to target (every other tree he's already in is excluded, and there are only two trees total in this fixture).
2. Add him to that tree, then navigate to it (`/gia-pha-chi-nhanh-mien-nam-mau` or its current slug).
   - **Expect**: "Bùi Văn Cha" now appears in this tree's canvas alongside "Bùi Thị Út", as an unconnected node (no relationships recorded here yet).
3. Select "Bùi Văn Cha" in this tree and expand "Gia đình".
   - **Expect**: no relatives are shown — his parent/child relationships from the default tree are **not** visible here (FR-016).
4. Click "Thêm mối quan hệ" for him in this tree.
   - **Expect**: the person-selection dropdown lists only "Bùi Thị Út" — not "Bùi Văn Tổ"/"Trần Thị Tổ Mẫu" from the other tree.
5. Go back to the default tree and re-open "Bùi Văn Cha".
   - **Expect**: his original parent relationship (restored in US1 step 5) is still exactly as it was — adding him to the second tree changed nothing there (FR-008).
6. Open "Thêm vào cây gia phả khác" for "Bùi Thị Út" (who has only one membership).
   - **Expect**: her own tree's "remove" action (if you open a membership-management view for her) is disabled/absent, since removing it would leave her with zero family trees (FR-007).
7. Remove "Bùi Văn Cha" from the second tree again (cleanup) via its "remove from this tree" action.
   - **Expect**: succeeds immediately (no relationships to cascade-confirm there yet), and he disappears from that tree's canvas but remains in the default tree unchanged.
8. As the unauthenticated (signed-out) guest, open the second tree's public page.
   - **Expect**: no indication anywhere that "Bùi Thị Út" (or anyone else shown) belongs to any other family tree — no "also in..." text, no cross-tree link (FR-017, SC-006).

## User Story 3 — Rename an existing family tree (P3)

1. As admin, open Quản trị → Quản lý cây gia phả (`/quan-tri/cay-gia-pha`).
2. On "Gia Phả Chi Nhánh Miền Nam (Mẫu)", click the new "✏️ Sửa tên" action, change the name to "Gia Phả Chi Nhánh Miền Nam", save.
   - **Expect**: the list item updates immediately; the home sidebar title and the tree's own page header (if currently open in another tab/after reload) both show the new name (SC-001).
3. Try saving a blank name.
   - **Expect**: the save button is disabled, or the server rejects it with "Tên cây gia phả không được để trống." if bypassed.
4. Sign in as `editor@giapha.test` and open the same management page.
   - **Expect**: no "Sửa tên" action is available (FR-003) — the same restriction already visible today for "Xoá cây gia phả"/"Đặt làm mặc định".
5. Rename it back to "Gia Phả Chi Nhánh Miền Nam (Mẫu)" (cleanup).
