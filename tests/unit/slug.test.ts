import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("transliterates Vietnamese diacritics, including đ/Đ", () => {
    expect(slugify("Gia Phả Dòng Họ Bùi (Mẫu)")).toBe("gia-pha-dong-ho-bui-mau");
    expect(slugify("Đặng Văn Cường")).toBe("dang-van-cuong");
  });

  it("lowercases and collapses non-alphanumeric runs into single hyphens", () => {
    expect(slugify("Nguyễn   Family!!")).toBe("nguyen-family");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -- Chi Nhánh --  ")).toBe("chi-nhanh");
  });

  it("returns an empty string for input with no alphanumeric content", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase alphanumeric-and-hyphen slugs", () => {
    expect(isValidSlug("gia-pha-dong-ho-bui")).toBe(true);
    expect(isValidSlug("chi-nhanh-2")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
  });

  it.each(["", "Gia-Pha", "-leading-hyphen", "trailing-hyphen-", "co dau cach", "co_gach_duoi", "cótiếngviệt"])(
    "rejects %j",
    (candidate) => {
      expect(isValidSlug(candidate)).toBe(false);
    },
  );
});
