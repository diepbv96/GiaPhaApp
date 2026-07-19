import { describe, expect, it } from "vitest";
import { denormalizeDate, normalizeDate } from "@/features/individuals/dateNormalization";

describe("date normalize/denormalize round-trip", () => {
  it("re-normalizing a denormalized year-precision date doesn't double-append", () => {
    // Regression: editing an individual without touching the date field used to feed the
    // full stored value ("1931-01-01") straight into normalizeDate again on submit,
    // producing "1931-01-01-01-01" and failing the DB's date column check.
    const stored = "1931-01-01";
    const denormalized = denormalizeDate(stored, "year");
    expect(denormalized).toBe("1931");
    expect(normalizeDate(denormalized, "year")).toBe(stored);
  });

  it("round-trips a month-precision date", () => {
    const stored = "1958-07-01";
    const denormalized = denormalizeDate(stored, "month");
    expect(denormalized).toBe("1958-07");
    expect(normalizeDate(denormalized, "month")).toBe(stored);
  });

  it("leaves a day-precision date untouched", () => {
    const stored = "1980-11-02";
    expect(denormalizeDate(stored, "day")).toBe(stored);
    expect(normalizeDate(stored, "day")).toBe(stored);
  });
});
