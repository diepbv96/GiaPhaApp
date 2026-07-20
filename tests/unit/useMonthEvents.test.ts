import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMonthEvents } from "@/features/events/useMonthEvents";
import type { Individual } from "@/types";

function individual(overrides: Partial<Individual> & { id: string; fullName: string }): Individual {
  return {
    familyTreeId: "tree-1",
    gender: "unknown",
    isDeceased: false,
    ...overrides,
  };
}

describe("useMonthEvents", () => {
  it("matches a full-precision birthday to its Gregorian month/day regardless of birth year", () => {
    const person = individual({
      id: "p1",
      fullName: "Bùi Văn A",
      birthDate: { value: "1958-03-15", precision: "day" },
    });

    const { result } = renderHook(() => useMonthEvents([person], 3));

    expect(result.current.get(15)).toEqual([{ type: "birthday", individual: person, day: 15 }]);
  });

  it("only counts a death anniversary when the person is marked deceased", () => {
    const notDeceased = individual({
      id: "p2",
      fullName: "Bùi Thị B",
      isDeceased: false,
      deathDate: { value: "2020-03-15", precision: "day" },
    });

    const { result } = renderHook(() => useMonthEvents([notDeceased], 3));

    expect(result.current.get(15)).toBeUndefined();
  });

  it("lists every person sharing the same day (Edge Cases)", () => {
    const a = individual({ id: "p3", fullName: "A", birthDate: { value: "1990-05-01", precision: "day" } });
    const b = individual({ id: "p4", fullName: "B", birthDate: { value: "1985-05-01", precision: "day" } });

    const { result } = renderHook(() => useMonthEvents([a, b], 5));

    expect(result.current.get(1)).toHaveLength(2);
  });

  it("ignores partial/unknown-precision dates (never invents a recurring event)", () => {
    const yearOnly = individual({
      id: "p5",
      fullName: "C",
      birthDate: { value: "1990-01-01", precision: "year" },
    });

    const { result } = renderHook(() => useMonthEvents([yearOnly], 1));

    expect(result.current.size).toBe(0);
  });

  it("returns an empty map for a month with no matching events", () => {
    const person = individual({ id: "p6", fullName: "D", birthDate: { value: "1990-08-20", precision: "day" } });

    const { result } = renderHook(() => useMonthEvents([person], 1));

    expect(result.current.get(20)).toBeUndefined();
  });
});
