// Regenerates public/templates/import-template.xlsx from the column contract in
// specs/001-family-tree-app/contracts/xlsx-import-template.md. Run after editing that
// contract so the downloadable template stays in sync:
//
//   node scripts/generate-import-template.mjs

import { utils, write } from "xlsx";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import path from "node:path";

const SHEET_NAME = "CaThe";

const header = [
  "Mã số",
  "Họ tên",
  "Bí danh",
  "Giới tính",
  "Ngày sinh",
  "Đã mất",
  "Ngày mất",
  "Ghi chú",
  "Số thứ tự",
  "Mã cha",
  "Mã mẹ",
  "Mã vợ/chồng",
];

// 4 generations, deliberately covering the trickier cases: a man with two wives (3, 8),
// a woman remarried twice (11), a daughter who married out with no further descendants
// recorded (6 + 7), and half-siblings from a second marriage (14 vs. 8/11).
const rows = [
  // Đời 1: ông bà tổ.
  ["1", "Bùi Văn Tổ", "", "Nam", "1900", "Có", "1975", "Thuỷ tổ dòng họ Bùi", "", "", "", "2"],
  ["2", "Trần Thị Tổ Mẫu", "", "Nữ", "1905", "", "1980", "", "", "", "", "1"],

  // Đời 2: hai con của đời 1. Cha (3) có hai vợ — vợ cả mất sớm, vợ hai là kế mẫu.
  // Cô (6) là con gái, lấy chồng (7) — không cần khai thêm con cháu của nhà chồng.
  ["3", "Bùi Văn Cha", "Ba", "Nam", "1928-04-10", "", "1995", "Con cả, nối dõi", "2", "1", "2", "4, 5"],
  ["4", "Nguyễn Thị Mẹ Cả", "", "Nữ", "1930", "", "1960", "Vợ cả, mất sớm", "", "", "", "3"],
  ["5", "Lê Thị Kế Mẫu", "", "Nữ", "1935", "", "", "Vợ hai, kế mẫu", "", "", "", "3"],
  ["6", "Bùi Thị Cô", "", "Nữ", "1931", "", "", "Con gái, lấy chồng xa", "3", "1", "2", "7"],
  ["7", "Phạm Văn Rể", "", "Nam", "1929", "", "", "", "", "", "", "6"],

  // Đời 3: con của Cha. Con (8) và Út (11) là con ruột của vợ cả (4); Em (14) là con
  // của kế mẫu (5) — nên Em không cùng "Số thứ tự" với Con/Út (khác mẹ).
  // Con (8) có hai vợ; Út (11) tái hôn hai lần (hai chồng).
  ["8", "Bùi Văn Con", "", "Nam", "1955-06-01", "", "", "Con cả của vợ cả", "2", "3", "4", "9, 10"],
  ["9", "Ngô Thị Dâu Cả", "", "Nữ", "1957", "", "", "Vợ cả", "", "", "", "8"],
  ["10", "Vũ Thị Dâu Thứ", "", "Nữ", "1962", "", "", "Vợ hai", "", "", "", "8"],
  ["11", "Bùi Thị Út", "", "Nữ", "1958", "", "", "Con thứ của vợ cả, tái hôn hai lần", "3", "3", "4", "12, 13"],
  ["12", "Trần Văn Một", "", "Nam", "1956", "Có", "1985", "Chồng đầu, đã mất", "", "", "", "11"],
  ["13", "Đỗ Văn Hai", "", "Nam", "1960", "", "", "Chồng hai", "", "", "", "11"],
  ["14", "Bùi Văn Em", "", "Nam", "1963", "", "", "Con của kế mẫu", "2", "3", "5", ""],

  // Đời 4: mỗi cặp ở đời 3 chỉ khai một con — mỗi người là con cả (thứ 2) của cặp đó.
  ["15", "Bùi Văn Trưởng Tôn", "", "Nam", "1980-02-14", "", "", "Đích tôn, con vợ cả", "2", "8", "9", ""],
  ["16", "Bùi Thị Tôn Nữ", "", "Nữ", "1985", "", "", "Con vợ hai", "2", "8", "10", ""],
  ["17", "Trần Thị Cháu Một", "", "Nữ", "1979", "", "", "Con của chồng đầu", "2", "12", "11", ""],
  ["18", "Đỗ Văn Cháu Hai", "", "Nam", "1992", "", "", "Con của chồng hai", "2", "13", "11", ""],
];

const sheet = utils.aoa_to_sheet([header, ...rows]);
sheet["!cols"] = [
  { wch: 8 }, // Mã số
  { wch: 22 }, // Họ tên
  { wch: 14 }, // Bí danh
  { wch: 10 }, // Giới tính
  { wch: 12 }, // Ngày sinh
  { wch: 8 }, // Đã mất
  { wch: 12 }, // Ngày mất
  { wch: 32 }, // Ghi chú
  { wch: 10 }, // Số thứ tự
  { wch: 8 }, // Mã cha
  { wch: 8 }, // Mã mẹ
  { wch: 14 }, // Mã vợ/chồng
];

const workbook = utils.book_new();
utils.book_append_sheet(workbook, sheet, SHEET_NAME);

const outPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "templates",
  "import-template.xlsx",
);
// write() + fs.writeFileSync() (rather than the higher-level writeFile()) sidesteps a
// SheetJS environment-detection quirk where xlsx.mjs's writeFile() doesn't always find
// Node's fs when imported via ESM.
const buffer = write(workbook, { bookType: "xlsx", type: "buffer" });
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
