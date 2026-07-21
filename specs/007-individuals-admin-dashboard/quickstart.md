# Quickstart: Individuals Admin Dashboard

Prerequisites: dev server running (`npm run dev`), signed in as the seeded admin (`admin@giapha.test` / `GiaPha!Test123`, from `supabase/seed/seed.sql`). Uses both seeded trees: "Gia Phả Dòng Họ Bùi (Mẫu)" (default — "Bùi Văn Tổ", "Trần Thị Tổ Mẫu", "Bùi Văn Cha") and "Gia Phả Chi Nhánh Miền Nam (Mẫu)" ("Bùi Thị Út"). For volume testing (SC-001/SC-005), seed 1,000+ additional individuals across both trees via the existing `.xlsx` import feature or a throwaway SQL seed script before testing pagination performance specifically.

## User Story 1 — Browse and locate any individual (P1)

1. Open `/quan-tri/ca-nhan` as admin.
   - **Expect**: a list showing individuals from both seeded trees, each row showing name and the tree(s) they belong to (FR-001/FR-002).
2. Select "Gia Phả Chi Nhánh Miền Nam (Mẫu)" in the tree filter.
   - **Expect**: the list narrows to only "Bùi Thị Út" (and anyone else added to that tree).
3. Clear the filter, then type "but" in the search box (no diacritics).
   - **Expect**: "Bùi Văn Tổ", "Bùi Văn Cha", "Bùi Thị Út" all appear — diacritic-insensitive match on `Bùi` (FR-004).
4. With the tree filter still cleared, type a name that matches no one (e.g. "zzz").
   - **Expect**: a clear "no results" message replaces the list (FR-006).
5. Apply the tree filter and a search term together (e.g. tree = default, search = "cha").
   - **Expect**: only individuals satisfying both conditions appear (FR-005).
6. Sign out, then attempt to open `/quan-tri/ca-nhan` directly; repeat signed in as `viewer@giapha.test`.
   - **Expect**: both are redirected away / denied (FR-012).

## User Story 2 — Edit an individual's information from the dashboard (P2)

1. As admin on `/quan-tri/ca-nhan`, click "Sửa" on "Bùi Văn Cha".
   - **Expect**: a form opens pre-filled with his current data (FR-007).
2. Change his `alias`, save.
   - **Expect**: the dashboard row updates immediately; opening the default tree's canvas and selecting him shows the same updated alias (FR-009).
3. Clear the required name field and attempt to save.
   - **Expect**: the save is rejected with a clear message (FR-008).
4. Open the edit form again, make a change, click cancel instead of save.
   - **Expect**: no change is persisted.

## User Story 3 — Delete an individual from the dashboard (P3)

1. As admin, click "Xoá" on "Bùi Thị Út" (has zero relationships, one tree membership).
   - **Expect**: confirmation states she'll be removed entirely (no relationship checkbox needed, since she has none); confirm.
   - **Expect**: she disappears from the dashboard list and from her tree's canvas.
2. Add "Bùi Văn Cha" to a second tree (via existing "Thêm vào cây gia phả khác" action, or pre-seed this), then click "Xoá" on him from the dashboard.
   - **Expect**: confirmation explicitly states he'll be removed from every family tree he belongs to and all of his relationships; the checkbox (since he has relationships) must be checked before confirming.
   - **Expect** (regression check for the trigger fix in data-model.md): the delete succeeds without error even though he belongs to more than one tree — he disappears from **every** tree's canvas, not just one.
3. Attempt to delete the same individual a second time in quick succession (e.g. open two browser tabs, delete from one, then confirm delete from the other without refreshing).
   - **Expect**: the second attempt is rejected with a "no longer exists" message, not a false success (FR-013).
4. Sign in as `viewer@giapha.test`.
   - **Expect**: no delete action is available anywhere on the dashboard (viewers have no access to the page at all, per US1 scenario 6).

## Cleanup

Re-run the seed script (`supabase/seed/seed.sql`) or restore from a pre-test snapshot to reset fixture data deleted during the User Story 3 steps above.
