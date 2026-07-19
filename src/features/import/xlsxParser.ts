// Parses and validates an uploaded .xlsx file against the fixed template documented in
// specs/001-family-tree-app/contracts/xlsx-import-template.md.
//
// Single sheet: one row per person. Relationships (cha/mẹ/vợ-chồng) are columns on that
// same row, referencing other rows by "Mã số" — no separate relationships sheet.

import { read, utils } from "xlsx";
import type { DatePrecision, Gender } from "@/types";
import { DataAccessError } from "@/types";

const SHEET_NAME = "CaThe";

const GENDER_LABEL_TO_VALUE: Record<string, Gender> = {
  Nam: "male",
  Nữ: "female",
  "Không rõ": "unknown",
};

export interface ParsedDate {
  value: string;
  precision: DatePrecision;
}

export interface ParsedIndividualRow {
  rowNumber: number;
  rowId: string;
  fullName: string;
  alias?: string;
  gender?: Gender;
  birthDate?: ParsedDate;
  isDeceased: boolean;
  deathDate?: ParsedDate;
  notes?: string;
  siblingOrder?: number;
  fatherRowId?: string;
  motherRowId?: string;
  spouseRowIds: string[];
  errors: string[];
}

function parseDateCell(raw: unknown): { date?: ParsedDate; error?: string } {
  if (raw === undefined || raw === null || raw === "") return {};
  const text = String(raw).trim();

  if (/^\d{4}$/.test(text)) return { date: { value: `${text}-01-01`, precision: "year" } };
  if (/^\d{4}-\d{2}$/.test(text)) return { date: { value: `${text}-01`, precision: "month" } };
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { date: { value: text, precision: "day" } };

  return { error: `Ngày không hợp lệ: "${text}" (cần YYYY-MM-DD, YYYY-MM hoặc YYYY)` };
}

function parseDeceasedCell(raw: unknown, hasDeathDate: boolean): { isDeceased: boolean; error?: string } {
  const label = String(raw ?? "").trim();
  if (!label) return { isDeceased: hasDeathDate }; // blank: infer from Ngày mất
  if (label === "Có") return { isDeceased: true };
  if (label === "Không") return { isDeceased: false };
  return { isDeceased: hasDeathDate, error: `Đã mất không hợp lệ: "${label}" (cần Có, Không, hoặc để trống)` };
}

function parseSpouseCell(raw: unknown): string[] {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  return text
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function parseSiblingOrderCell(raw: unknown): { siblingOrder?: number; error?: string } {
  const text = String(raw ?? "").trim();
  if (!text) return {};
  if (!/^\d+$/.test(text) || Number(text) < 2) {
    return { error: `Số thứ tự không hợp lệ: "${text}" (theo cách gọi người Việt, từ 2 trở đi — không có thứ nhất)` };
  }
  return { siblingOrder: Number(text) };
}

export function parseIndividualsSheet(rows: Record<string, unknown>[]): ParsedIndividualRow[] {
  return rows.map((row, index) => {
    const errors: string[] = [];
    const rowId = String(row["Mã số"] ?? "").trim();
    const fullName = String(row["Họ tên"] ?? "").trim();
    const genderLabel = String(row["Giới tính"] ?? "").trim();
    const notesRaw = row["Ghi chú"];
    const notes = notesRaw !== undefined && notesRaw !== null ? String(notesRaw) : undefined;

    if (!rowId) errors.push("Thiếu Mã số");
    if (!fullName) errors.push("Thiếu Họ tên");

    const gender = GENDER_LABEL_TO_VALUE[genderLabel];
    if (!gender) errors.push(`Giới tính không hợp lệ: "${genderLabel}" (cần Nam, Nữ, hoặc Không rõ)`);

    const birth = parseDateCell(row["Ngày sinh"]);
    if (birth.error) errors.push(`Ngày sinh: ${birth.error}`);

    const death = parseDateCell(row["Ngày mất"]);
    if (death.error) errors.push(`Ngày mất: ${death.error}`);

    const deceased = parseDeceasedCell(row["Đã mất"], Boolean(death.date));
    if (deceased.error) errors.push(deceased.error);

    if (notes && notes.length > 100) errors.push("Ghi chú vượt quá 100 ký tự");

    const siblingOrder = parseSiblingOrderCell(row["Số thứ tự"]);
    if (siblingOrder.error) errors.push(siblingOrder.error);

    const fatherRowId = String(row["Mã cha"] ?? "").trim() || undefined;
    const motherRowId = String(row["Mã mẹ"] ?? "").trim() || undefined;
    const spouseRowIds = parseSpouseCell(row["Mã vợ/chồng"]);

    if (fatherRowId && rowId && fatherRowId === rowId) errors.push("Mã cha không thể là chính người này");
    if (motherRowId && rowId && motherRowId === rowId) errors.push("Mã mẹ không thể là chính người này");
    if (rowId && spouseRowIds.includes(rowId)) errors.push("Mã vợ/chồng không thể là chính người này");

    return {
      rowNumber: index + 2, // +1 for 0-index, +1 for header row
      rowId,
      fullName,
      alias: row["Bí danh"] ? String(row["Bí danh"]).trim() : undefined,
      gender,
      birthDate: birth.date,
      isDeceased: deceased.isDeceased,
      deathDate: deceased.isDeceased ? death.date : undefined,
      notes: notes || undefined,
      siblingOrder: siblingOrder.siblingOrder,
      fatherRowId,
      motherRowId,
      spouseRowIds,
      errors,
    };
  });
}

export async function parseXlsxFile(file: File): Promise<ParsedIndividualRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array", raw: false });

  if (workbook.SheetNames.length === 0) {
    throw new DataAccessError("VALIDATION_FAILED", "File không có sheet nào.");
  }

  // Prefer the documented sheet name, but fall back to the first sheet so a file
  // with just one renamed sheet still works.
  const sheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0];

  const sheetRows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    raw: false,
    defval: "",
  });

  return parseIndividualsSheet(sheetRows);
}
