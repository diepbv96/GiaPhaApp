import { useMemo } from "react";
import type { Individual, LifeEvent } from "@/types";

/** Parses the month/day out of a full-precision `PartialDate.value` ("YYYY-MM-DD"). */
function monthDayOf(value: string): { month: number; day: number } {
  const [, month, day] = value.split("-").map(Number);
  return { month, day };
}

/**
 * Derives, for the given `month` being browsed, every recurring Life Event (birthday
 * or death anniversary) among `individuals` — per
 * specs/002-lunar-events-tree-slugs/contracts/events-calendar.md. Matching is by
 * month-and-day only (FR-008): the event recurs every year, so the source date's own
 * year — and the calendar's currently-displayed year — never changes the result.
 *
 * Only full ("day"-precision) dates can recur on a specific day — partial/unknown
 * dates never contribute an event, mirroring the lunar-date-unavailable rule.
 */
export function useMonthEvents(individuals: Individual[], month: number): Map<number, LifeEvent[]> {
  return useMemo(() => {
    const byDay = new Map<number, LifeEvent[]>();

    function add(day: number, event: LifeEvent) {
      const existing = byDay.get(day);
      if (existing) {
        existing.push(event);
      } else {
        byDay.set(day, [event]);
      }
    }

    for (const individual of individuals) {
      if (individual.birthDate?.precision === "day") {
        const { month: birthMonth, day: birthDay } = monthDayOf(individual.birthDate.value);
        if (birthMonth === month) {
          add(birthDay, { type: "birthday", individual, day: birthDay });
        }
      }

      if (individual.isDeceased && individual.deathDate?.precision === "day") {
        const { month: deathMonth, day: deathDay } = monthDayOf(individual.deathDate.value);
        if (deathMonth === month) {
          add(deathDay, { type: "death_anniversary", individual, day: deathDay });
        }
      }
    }

    return byDay;
  }, [individuals, month]);
}
