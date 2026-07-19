# Contract: Predefined `.xlsx` Import Template

This is the fixed column contract that Admin/Editor-uploaded spreadsheets must follow (FR-013, FR-015). The importer (`src/features/import/`) validates every uploaded file's structure against this contract before processing any rows.

## File structure

- File type: `.xlsx` (single workbook).
- **One sheet**, named `CaThe` (if the sheet is renamed, the importer falls back to reading whichever sheet is first in the workbook).
- One row per person. Relationships (cha/mẹ/vợ-chồng) are columns on that same row, referencing other rows by `Mã số` — there is no separate relationships sheet.
- Row 1 is the header row and must match the column names below exactly (order does not matter; extra unrecognized columns are ignored).
- A file with no sheets is rejected outright with an explanation (FR-015) — no rows are imported from that file.

## Sheet: `CaThe`

| Column | Required | Format | Notes |
|---|---|---|---|
| `Mã số` | Yes | short text/number, unique within the sheet | A per-file, user-assigned identifier (not a database id) used by `Mã cha`/`Mã mẹ`/`Mã vợ/chồng` on other rows to reference this person. |
| `Họ tên` | Yes | text | Maps to `individuals.full_name` (FR-005). |
| `Bí danh` | No | text | Maps to `individuals.alias`. |
| `Giới tính` | Yes | one of `Nam`, `Nữ`, `Không rõ` (FR-026) | Maps to `individuals.gender`. |
| `Ngày sinh` | No | `YYYY-MM-DD`, `YYYY-MM`, or `YYYY`; blank allowed | Maps to `individuals.birth_date` + `birth_date_precision` (FR-006). |
| `Đã mất` | No | one of `Có`, `Không`, or blank | Maps to `individuals.is_deceased`. If blank, inferred as `Có` when `Ngày mất` is filled in, `Không` otherwise. |
| `Ngày mất` | No | same format as `Ngày sinh`; blank allowed | Maps to `individuals.death_date` + `death_date_precision`; only stored when `Đã mất` resolves to `Có`. |
| `Ghi chú` | No | text, max 100 characters | Maps to `individuals.notes` (FR-007); rows exceeding 100 characters fail validation for that row only. |
| `Số thứ tự` | No | integer ≥ 2; blank allowed | Maps to `individuals.sibling_order`. Manually assigned per the Vietnamese naming convention (eldest = 2, then 3, 4, ... — there's no "thứ nhất", so 1 is rejected) — not derived from `Ngày sinh`. Only meaningful relative to siblings sharing the same `Mã cha`/`Mã mẹ`; leave blank for an only child or when not known. |
| `Mã cha` | No | must match a `Mã số` on another row | Creates a `parent_child` relationship (this row is the child). |
| `Mã mẹ` | No | must match a `Mã số` on another row | Creates a `parent_child` relationship (this row is the child). |
| `Mã vợ/chồng` | No | one or more `Mã số` values, comma-separated | Creates a `spouse` relationship per value — supports more than one (remarriage). Declaring the pair from either row (or both, symmetrically) is fine; a symmetric second declaration is silently deduplicated rather than reported as a conflict. |

Siblings and in-law relationships (con dâu/con rể) are **not** declared explicitly — the app derives them: siblings share a recorded `Mã cha`/`Mã mẹ`, and an in-law is a spouse of a biological child who isn't also linked via `Mã cha`/`Mã mẹ` to that child's parents.

## Row-level validation (applied after structural validation passes)

Per FR-014, every row is validated independently; valid rows are still imported even if other rows fail.

- A row fails if: `Họ tên` blank, `Giới tính` not one of the allowed values, `Ghi chú` over 100 characters, `Ngày sinh`/`Ngày mất`/`Đã mất` present but not a recognized value, `Số thứ tự` present but not an integer ≥ 2, `Mã số` duplicated within the sheet, or `Mã cha`/`Mã mẹ`/`Mã vợ/chồng` references itself.
- A row is flagged **duplicate** (not failed, not silently imported — FR-025) if an existing individual in the target tree has an exact match on `Họ tên` + resolved `Ngày sinh` (only when both are known/resolvable).
- A relationship (derived from `Mã cha`/`Mã mẹ`/`Mã vợ/chồng`) fails if the referenced `Mã số` does not resolve to a row that itself imported successfully.

## Import result summary

After processing, the importer reports (surfaced in the UI, backed by `import_batches`/`import_row_results` in `data-model.md`):

- Total rows processed (individuals + derived relationships)
- Succeeded / Failed / Duplicate counts
- Per-row failure reason, labeled "Cá thể" or "Mối quan hệ" and referencing the row number, in Vietnamese (FR-026)
