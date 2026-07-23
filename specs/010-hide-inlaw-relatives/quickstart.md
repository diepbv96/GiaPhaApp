# Quickstart: Cascade-Hide In-Law-Only Relatives

Prerequisites: dev server running (`npm run dev`), signed in as the seeded admin (`admin@giapha.test` / `GiaPha!Test123`, from `supabase/seed/seed.sql`). Uses the default tree ("Gia Phả Dòng Họ Bùi (Mẫu)"), which already seeds a founder couple ("Bùi Văn Tổ" + "Trần Thị Tổ Mẫu") and their child ("Bùi Văn Cha").

## Setup — build the scenario the spec describes

1. Select "Bùi Văn Cha" on the canvas, add a new individual as his child (e.g. "Bùi Văn Con") — this is the blood-line grandchild.
2. Select "Bùi Văn Con", use "Thêm mối quan hệ" to add a spouse — a new individual (e.g. "Trần Thị Dâu"). This is the in-law.
3. Select "Trần Thị Dâu", add a new individual as *her* child, without connecting that child to "Bùi Văn Con" (e.g. "Trần Văn Riêng") — this is her exclusive child ("con riêng"), not a shared child of the couple.
4. Optionally, add one more individual as a child of "Trần Văn Riêng" (e.g. "Trần Thị Chắt") to exercise the transitive/grandchild case.
5. Separately, add a second child of "Bùi Văn Con" **and** "Trần Thị Dâu" together (both recorded as parents) — e.g. "Bùi Thị Chung" — this is the shared child.

## User Story 1 — A married-in relative's own family disappears too (P1)

1. With "Ẩn dâu/rễ" off (default), confirm every individual added above is visible, including "Trần Thị Dâu", "Trần Văn Riêng", "Trần Thị Chắt", and "Bùi Thị Chung", each connected by a visible line to their recorded relationship(s).
2. Enable "Ẩn dâu/rễ" from the sidebar.
   - **Expect** (acceptance scenario 1): "Trần Thị Dâu" (the in-law) and "Trần Văn Riêng" (her exclusive child) both disappear from the canvas.
   - **Expect** (acceptance scenario 2): "Trần Thị Chắt" (the exclusive child's own child) also disappears — no dangling/disconnected card is left behind for any of the three.
   - **Expect** (acceptance scenario 3): "Bùi Thị Chung" (the shared child of "Bùi Văn Con" and "Trần Thị Dâu") **remains visible**, still connected to "Bùi Văn Con".
   - **Expect**: "Bùi Văn Tổ", "Trần Thị Tổ Mẫu", "Bùi Văn Cha", and "Bùi Văn Con" are all unaffected.
3. Disable "Ẩn dâu/rễ" again.
   - **Expect** (acceptance scenario 4): every individual and relationship reappears exactly as in step 1 — no data was lost or altered; this is purely a display toggle.
4. Reload the page with "Ẩn dâu/rễ" off.
   - **Expect** (acceptance scenario 5): nothing about the toggled-off state has changed from before this feature existed.

## Regression check — existing `filterOutInLaws` behavior is preserved

Run the existing unit suite; the three pre-existing cases in `tests/unit/inLawFilter.test.ts` ("keeps a founding couple", "hides a spouse who married a recorded blood descendant", "keeps siblings and their shared parent") must continue to pass unmodified, alongside the new cascade cases added for this feature (see contracts/cascade-in-law-filter.md's numbered test list).

```bash
npm run test -- inLawFilter
```

## Cleanup

Delete "Trần Thị Dâu", "Trần Văn Riêng", "Trần Thị Chắt", "Bùi Thị Chung", and "Bùi Văn Con" (via each individual's existing delete action) to restore the seed tree, or reset from `supabase/seed/seed.sql`.
