import { toLunarDate } from "@/lib/lunarCalendar";
import type { LunarDate, PartialDate } from "@/types";

/** "Ngày 1 tháng 1 (nhuận) năm 2024 (âm lịch)" — day/month always shown, leap month
 * called out explicitly per the contract (never presented as an ordinary month). */
export function formatLunarDate(lunar: LunarDate): string {
  const leapSuffix = lunar.isLeapMonth ? " (nhuận)" : "";
  return `Ngày ${lunar.day} tháng ${lunar.month}${leapSuffix} năm ${lunar.year} (âm lịch)`;
}

export interface LunarDateBadgeProps {
  /** The Gregorian source date, at whatever precision it's actually known to. */
  date?: PartialDate;
}

/**
 * Renders the lunar-calendar equivalent of `date` when it's computable (full
 * day-level precision, within the supported conversion range), or a clear
 * "unavailable" note otherwise. Renders nothing when there's no date at all —
 * that's a different case (e.g. a living person has no death date) than "known but
 * not computable" (spec FR-003, User Story 1 acceptance scenario 3).
 */
export function LunarDateBadge({ date }: LunarDateBadgeProps) {
  if (!date) return null;

  if (date.precision !== "day") {
    return <p className="text-xs italic text-[var(--color-ink-muted)]">Không xác định được ngày âm lịch</p>;
  }

  const [year, month, day] = date.value.split("-").map(Number);
  const lunar = toLunarDate({ day, month, year });

  if (!lunar) {
    return <p className="text-xs italic text-[var(--color-ink-muted)]">Không xác định được ngày âm lịch</p>;
  }

  return <p className="text-xs text-[var(--color-ink-muted)]">{formatLunarDate(lunar)}</p>;
}
