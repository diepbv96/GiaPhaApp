import { toLunarDate } from "@/lib/lunarCalendar";
import type { LunarDate, PartialDate } from "@/types";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** "10/12/2024 AL" — compact, inline-friendly, paired with a Gregorian DD/MM/YYYY
 * value on the same line. Leap month is called out with an explicit trailing note
 * (never folded into the numeric month) so it's never presented as an ordinary month. */
export function formatLunarDate(lunar: LunarDate): string {
  const leapSuffix = lunar.isLeapMonth ? " (nhuận)" : "";
  return `${pad2(lunar.day)}/${pad2(lunar.month)}/${lunar.year} AL${leapSuffix}`;
}

export interface LunarDateBadgeProps {
  /** The Gregorian source date, at whatever precision it's actually known to. */
  date?: PartialDate;
}

/**
 * Renders the lunar-calendar equivalent of `date` inline, right after its Gregorian
 * counterpart — e.g. "01/01/2025 (10/12/2024 AL)" — when it's computable (full
 * day-level precision, within the supported conversion range), or a clear inline
 * "unavailable" note otherwise. Renders nothing when there's no date at all —
 * that's a different case (e.g. a living person has no death date) than "known but
 * not computable" (spec 002 FR-003, User Story 1 acceptance scenario 3; spec 003
 * FR-007/FR-008 for the inline format itself).
 */
export function LunarDateBadge({ date }: LunarDateBadgeProps) {
  if (!date) return null;

  if (date.precision !== "day") {
    return <span className="ml-1 text-xs italic text-[var(--color-ink-muted)]">(không rõ ngày âm lịch)</span>;
  }

  const [year, month, day] = date.value.split("-").map(Number);
  const lunar = toLunarDate({ day, month, year });

  if (!lunar) {
    return <span className="ml-1 text-xs italic text-[var(--color-ink-muted)]">(không rõ ngày âm lịch)</span>;
  }

  return <span className="ml-1 text-xs text-[var(--color-ink-muted)]">({formatLunarDate(lunar)})</span>;
}
