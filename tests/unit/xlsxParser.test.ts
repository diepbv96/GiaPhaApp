import { describe, expect, it } from "vitest";
import { parseIndividualsSheet } from "@/features/import/xlsxParser";

describe("parseIndividualsSheet", () => {
  it("parses a valid row with a year-only birth date", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "Bùi Văn A", "Giới tính": "Nam", "Ngày sinh": "1954" },
    ]);

    expect(row.errors).toEqual([]);
    expect(row.gender).toBe("male");
    expect(row.birthDate).toEqual({ value: "1954-01-01", precision: "year" });
    expect(row.isDeceased).toBe(false);
  });

  it("flags a missing Họ tên (FR-005 / contract required column)", () => {
    const [row] = parseIndividualsSheet([{ "Mã số": "1", "Họ tên": "", "Giới tính": "Nam" }]);
    expect(row.errors).toContain("Thiếu Họ tên");
  });

  it("flags an invalid Giới tính value against the fixed Nam/Nữ/Không rõ enum", () => {
    const [row] = parseIndividualsSheet([{ "Mã số": "1", "Họ tên": "A", "Giới tính": "Male" }]);
    expect(row.errors.some((e: string) => e.startsWith("Giới tính không hợp lệ"))).toBe(true);
  });

  it("flags notes over the 100-character limit (FR-007)", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Ghi chú": "a".repeat(101) },
    ]);
    expect(row.errors).toContain("Ghi chú vượt quá 100 ký tự");
  });

  it("flags a malformed date", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Ngày sinh": "not-a-date" },
    ]);
    expect(row.errors.some((e: string) => e.startsWith("Ngày sinh:"))).toBe(true);
  });

  it("infers isDeceased from Ngày mất when Đã mất is blank", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Ngày mất": "2005" },
    ]);
    expect(row.isDeceased).toBe(true);
    expect(row.deathDate).toEqual({ value: "2005-01-01", precision: "year" });
  });

  it("respects an explicit Đã mất = Không even if Ngày mất is unknown", () => {
    const [row] = parseIndividualsSheet([{ "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Đã mất": "Không" }]);
    expect(row.isDeceased).toBe(false);
  });

  it("parses Mã cha/Mã mẹ/Mã vợ-chồng as relationship references", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "3", "Họ tên": "Con", "Giới tính": "Nam", "Mã cha": "1", "Mã mẹ": "2", "Mã vợ/chồng": "4, 5" },
    ]);
    expect(row.fatherRowId).toBe("1");
    expect(row.motherRowId).toBe("2");
    expect(row.spouseRowIds).toEqual(["4", "5"]);
  });

  it("flags a self-referencing Mã cha", () => {
    const [row] = parseIndividualsSheet([{ "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Mã cha": "1" }]);
    expect(row.errors).toContain("Mã cha không thể là chính người này");
  });

  it("parses Số thứ tự as a manually entered sibling ordinal", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Số thứ tự": "2" },
    ]);
    expect(row.errors).toEqual([]);
    expect(row.siblingOrder).toBe(2);
  });

  it("flags a non-numeric Số thứ tự", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Số thứ tự": "hai" },
    ]);
    expect(row.errors.some((e: string) => e.startsWith("Số thứ tự không hợp lệ"))).toBe(true);
  });

  it("flags Số thứ tự = 1 (no \"thứ nhất\" in the Vietnamese convention)", () => {
    const [row] = parseIndividualsSheet([
      { "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam", "Số thứ tự": "1" },
    ]);
    expect(row.errors.some((e: string) => e.startsWith("Số thứ tự không hợp lệ"))).toBe(true);
  });

  it("leaves Số thứ tự unset when blank", () => {
    const [row] = parseIndividualsSheet([{ "Mã số": "1", "Họ tên": "A", "Giới tính": "Nam" }]);
    expect(row.siblingOrder).toBeUndefined();
  });
});
