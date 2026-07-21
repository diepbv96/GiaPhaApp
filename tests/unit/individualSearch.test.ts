import { describe, expect, it } from "vitest";
import { normalizeSearchTerm } from "@/features/individuals/individualSearch";

describe("normalizeSearchTerm", () => {
  it("strips Vietnamese diacritics, including đ/Đ", () => {
    expect(normalizeSearchTerm("Bùi Văn Cha")).toBe("bui van cha");
    expect(normalizeSearchTerm("Đặng Văn Cường")).toBe("dang van cuong");
  });

  it("matches a diacritic-free search term against a diacritic-bearing name once both are normalized", () => {
    expect(normalizeSearchTerm("but")).toBe(normalizeSearchTerm("but"));
    expect(normalizeSearchTerm("Bui")).toBe(normalizeSearchTerm("Bùi"));
  });

  it("lowercases", () => {
    expect(normalizeSearchTerm("CHA")).toBe("cha");
  });

  it("trims leading/trailing whitespace but keeps internal spaces", () => {
    expect(normalizeSearchTerm("  Bùi Văn  ")).toBe("bui van");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeSearchTerm("   ")).toBe("");
  });
});
