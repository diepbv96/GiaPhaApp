import { describe, expect, it } from "vitest";
import { individualFormSchema } from "@/features/individuals/individualValidation";

const baseValues = {
  fullName: "Bùi Văn A",
  gender: "male" as const,
  birthDatePrecision: "unknown" as const,
  isDeceased: false,
  deathDatePrecision: "unknown" as const,
};

describe("individualFormSchema", () => {
  it("accepts a minimal valid individual (FR-005: only full name + gender required)", () => {
    const result = individualFormSchema.safeParse(baseValues);
    expect(result.success).toBe(true);
  });

  it("rejects a blank full name", () => {
    const result = individualFormSchema.safeParse({ ...baseValues, fullName: "  " });
    expect(result.success).toBe(false);
  });

  it("accepts notes at exactly 100 characters (FR-007 boundary)", () => {
    const notes = "a".repeat(100);
    const result = individualFormSchema.safeParse({ ...baseValues, notes });
    expect(result.success).toBe(true);
  });

  it("rejects notes over 100 characters (FR-007)", () => {
    const notes = "a".repeat(101);
    const result = individualFormSchema.safeParse({ ...baseValues, notes });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid gender value", () => {
    const result = individualFormSchema.safeParse({ ...baseValues, gender: "other" });
    expect(result.success).toBe(false);
  });

  it("accepts a blank siblingOrder (only child / unknown)", () => {
    const result = individualFormSchema.safeParse({ ...baseValues, siblingOrder: "" });
    expect(result.success).toBe(true);
  });

  it("accepts siblingOrder = 2 (the Vietnamese convention's eldest)", () => {
    const result = individualFormSchema.safeParse({ ...baseValues, siblingOrder: "2" });
    expect(result.success).toBe(true);
  });

  it("rejects siblingOrder = 1 (no \"thứ nhất\" in the Vietnamese convention)", () => {
    const result = individualFormSchema.safeParse({ ...baseValues, siblingOrder: "1" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric siblingOrder", () => {
    const result = individualFormSchema.safeParse({ ...baseValues, siblingOrder: "hai" });
    expect(result.success).toBe(false);
  });
});
