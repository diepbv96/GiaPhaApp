# Quickstart: Usability Enhancements — Delete, Sibling Order, Tree Navigation, Email Templates, Calendar Counts

Prerequisites: dev server running (`npm run dev`), signed in as the seeded admin (`supabase/seed/seed.sql`). Uses the seeded default tree ("Gia Phả Dòng Họ Bùi (Mẫu)") and the seeded second tree ("Gia Phả Chi Nhánh Miền Nam (Mẫu)"), which is non-default and only reachable by its slug — exactly the fixture US3 needs.

## User Story 1 — Delete a person along with their relationships (P1)

1. Select the seeded "Bùi Văn Cha" (who has 2 recorded relationships — spouse edges to his parents count as parent_child, not spouse; he has 2 `parent_child` edges to "Bùi Văn Tổ" and "Trần Thị Tổ Mẫu") and click "Xoá cá thể".
   - **Expect**: the dialog shows "Cá thể này đang có 2 mối quan hệ..." with a checkbox, and the "Xoá" button is disabled until it's checked (`contracts/delete-individual.md`).
2. Check the confirmation checkbox and click "Xoá".
   - **Expect**: no error; the person and both relationship rows are gone; they no longer appear as a parent-link on "Bùi Văn Tổ"/"Trần Thị Tổ Mẫu".
3. **Import-cascade regression check** (research.md §1): use the existing Excel-import feature to add a brand-new individual with zero relationships to any tree, then immediately try to delete that person.
   - **Expect**: deletion succeeds immediately with no confirmation dialog at all (FR-001) — before this fix, this specific case still threw "Không thể xoá: cá thể này vẫn còn mối quan hệ..." even though `relationshipCount` was 0.

## User Story 2 — Siblings ordered left-to-right, with a proper eldest-child label (P2)

1. On the default tree, add three new individuals as children of "Bùi Văn Tổ" + "Trần Thị Tổ Mẫu" (siblings of "Bùi Văn Cha"): one male with birth-order position 2, one female with position 3, one with no gender recorded (unknown) and no position set.
2. Open the tree view.
   - **Expect**: the three new siblings (plus "Bùi Văn Cha", who has no recorded position) appear left-to-right in ascending order — position 2 first, then position 3, then the un-positioned ones after both (`contracts/sibling-order-layout.md`).
3. Hover the position-2 sibling's tree badge, and open their detail panel.
   - **Expect**: both surfaces say "Con Trai Trưởng" (male) — not "Con thứ 2" — and agree with each other (FR-013).
4. Repeat step 3 logic for a position-2 sibling recorded as female → both surfaces say "Con Gái Trưởng"; and for one with gender left as "Không rõ" → both say "Con Trưởng".
5. Check the position-3 sibling's badge/detail panel.
   - **Expect**: both still say "Con thứ 3", unchanged from today's behavior (FR-011).

## User Story 3 — Open a family tree directly from the tree list (P2)

1. As admin, open Quản trị → Quản lý cây gia phả (`/quan-tri/cay-gia-pha`).
2. Find the "Gia Phả Chi Nhánh Miền Nam (Mẫu)" list item.
   - **Expect**: a "Xem chi tiết" action is present alongside "Đặt làm mặc định" / "Sửa slug" / "Xoá cây gia phả".
3. Click "Xem chi tiết".
   - **Expect**: the app navigates to that tree's own slug URL (e.g. `/gia-pha-chi-nhanh-mien-nam-mau`) and shows "Bùi Thị Út", not the default tree's people.
4. Edit that tree's slug (via "Sửa slug"), then click "Xem chi tiết" again.
   - **Expect**: it opens using the *new* slug value (FR-016).

## User Story 4 — Start from a sample email template (P3)

1. As admin, open the event-reminder notification settings. The seeded config has `template = ''` (never configured).
   - **Expect**: the "Nội dung email mẫu" textarea is already pre-filled with a realistic sample sentence using `{{ten_ca_nhan}}`, `{{loai_su_kien}}`, `{{ngay_duong}}`, `{{ngay_am}}`, `{{so_ngay_con_lai}}` (`contracts/sample-email-template.md`) — not empty.
2. Click save without changing anything.
   - **Expect**: success toast; reload the page — the same sample text loads again from the saved config (no longer from the client-side default).
3. Edit the text (e.g. add a sentence) and save.
   - **Expect**: the edited version persists and reloads correctly.

## User Story 5 — See how many events fall on a calendar date (P3)

1. Open "Sự kiện sắp tới" for the default tree in the month containing "Bùi Văn Cha"'s birthday (March) or death-anniversary (November) day.
   - **Expect**: that date's cell shows the digit "1", not the 🎉 emoji.
2. Add a second individual with a birth date on that same day/month.
   - **Expect**: the cell now shows "2".
3. Click that date.
   - **Expect**: the existing popup opens listing exactly 2 events, unchanged from today's popup behavior (FR-024).
4. Look at a date with no events.
   - **Expect**: no count, no indicator — unchanged from today.
