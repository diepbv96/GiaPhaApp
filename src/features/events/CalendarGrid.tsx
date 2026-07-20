import { toLunarDate } from "@/lib/lunarCalendar";
import type { LifeEvent } from "@/types";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export interface CalendarGridProps {
  month: number; // 1-12
  year: number;
  eventsByDay: Map<number, LifeEvent[]>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onNavigateMonth: (direction: -1 | 1) => void;
}

/** Month grid showing both the Gregorian and lunar date for every day (spec FR-005),
 * highlighting days with at least one Life Event (FR-006). Always renders 6 rows so
 * the grid's height doesn't jump between months. */
export function CalendarGrid({ month, year, eventsByDay, selectedDay, onSelectDay, onNavigateMonth }: CalendarGridProps) {
  const totalDays = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigateMonth(-1)}
          aria-label="Tháng trước"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]"
        >
          ‹ Tháng trước
        </button>
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          Tháng {month} năm {year}
        </h2>
        <button
          type="button"
          onClick={() => onNavigateMonth(1)}
          aria-label="Tháng sau"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)]"
        >
          Tháng sau ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[var(--color-ink-muted)]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} className="aspect-square rounded-lg" />;
          }

          const lunar = toLunarDate({ day, month, year });
          const events = eventsByDay.get(day) ?? [];
          const hasEvents = events.length > 0;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              aria-label={hasEvents ? `Ngày ${day}, có ${events.length} sự kiện` : `Ngày ${day}, không có sự kiện`}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition ${
                isSelected
                  ? "border-[var(--color-brand-600)] bg-[var(--color-brand-100)]"
                  : hasEvents
                    ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                    : "border-transparent hover:bg-[var(--color-brand-50)]"
              }`}
            >
              <span className="text-sm font-semibold text-[var(--color-ink)]">{day}</span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">
                {lunar ? `${lunar.day}/${lunar.month}${lunar.isLeapMonth ? "N" : ""}` : "—"}
              </span>
              {hasEvents && <span aria-hidden="true">🎉</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
