import { describe, expect, it } from "vitest";
import { siblingOrderLabel } from "@/lib/formatters";

describe("siblingOrderLabel", () => {
  it("returns the unset fallback when no order is recorded", () => {
    expect(siblingOrderLabel(undefined, "male")).toBe("Chưa rõ / con một");
  });

  it("labels position 2 as eldest son when male", () => {
    expect(siblingOrderLabel(2, "male")).toBe("Con Trai Trưởng");
  });

  it("labels position 2 as eldest daughter when female", () => {
    expect(siblingOrderLabel(2, "female")).toBe("Con Gái Trưởng");
  });

  it("labels position 2 as gender-neutral eldest when gender is unknown", () => {
    expect(siblingOrderLabel(2, "unknown")).toBe("Con Trưởng");
  });

  it("keeps the plain ordinal label for position 3 and beyond, regardless of gender", () => {
    expect(siblingOrderLabel(3, "female")).toBe("Con thứ 3");
    expect(siblingOrderLabel(5, "male")).toBe("Con thứ 5");
  });
});
