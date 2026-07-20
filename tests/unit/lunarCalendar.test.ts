import { describe, expect, it } from "vitest";
import { toLunarDate } from "@/lib/lunarCalendar";

describe("toLunarDate", () => {
  it.each([
    [{ day: 10, month: 2, year: 2024 }, { day: 1, month: 1, year: 2024 }], // Tết Giáp Thìn
    [{ day: 22, month: 1, year: 2023 }, { day: 1, month: 1, year: 2023 }], // Tết Quý Mão
    [{ day: 1, month: 2, year: 2022 }, { day: 1, month: 1, year: 2022 }], // Tết Nhâm Dần
    [{ day: 12, month: 2, year: 2021 }, { day: 1, month: 1, year: 2021 }], // Tết Tân Sửu
    [{ day: 5, month: 2, year: 2000 }, { day: 1, month: 1, year: 2000 }], // Tết Canh Thìn
  ])("maps %o to lunar new year's day %o", (gregorian, expected) => {
    const lunar = toLunarDate(gregorian);
    expect(lunar).not.toBeNull();
    expect(lunar).toMatchObject({ ...expected, isLeapMonth: false });
  });

  it("marks a known leap month correctly (2020's leap 4th lunar month)", () => {
    const lunar = toLunarDate({ day: 10, month: 6, year: 2020 });
    expect(lunar).toMatchObject({ month: 4, isLeapMonth: true });
  });

  it("returns null below the supported range", () => {
    expect(toLunarDate({ day: 1, month: 1, year: 1799 })).toBeNull();
  });

  it("returns null above the supported range", () => {
    expect(toLunarDate({ day: 1, month: 1, year: 2200 })).toBeNull();
  });

  it("returns null for an invalid Gregorian date (Feb 30)", () => {
    expect(toLunarDate({ day: 30, month: 2, year: 2024 })).toBeNull();
  });

  it("accepts the range boundaries", () => {
    expect(toLunarDate({ day: 1, month: 1, year: 1800 })).not.toBeNull();
    expect(toLunarDate({ day: 31, month: 12, year: 2199 })).not.toBeNull();
  });
});
