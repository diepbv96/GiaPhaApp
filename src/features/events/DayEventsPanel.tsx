import type { LifeEvent, LifeEventType } from "@/types";

const EVENT_TYPE_LABEL: Record<LifeEventType, string> = {
  birthday: "Sinh nhật",
  death_anniversary: "Ngày giỗ",
};

export interface DayEventsPanelProps {
  day: number;
  eventsByDay: Map<number, LifeEvent[]>;
  onSelectIndividual?: (individualId: string) => void;
}

/** Shows every Life Event matching `day`, or an explicit "no events" message when
 * none match (spec FR-007) — never a blank/ambiguous panel. Only ever rendered while
 * a day is selected, inside the popup that hosts it (`UpcomingEvents.tsx`), which
 * carries the date heading as its own title — this panel is the body only. */
export function DayEventsPanel({ day, eventsByDay, onSelectIndividual }: DayEventsPanelProps) {
  const events = eventsByDay.get(day) ?? [];

  return (
    <div className="flex flex-col gap-3">
      {events.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Không có sự kiện nào vào ngày này.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event, index) => (
            <li
              key={`${event.individual.id}-${event.type}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-brand-100)] bg-[var(--color-surface-raised)] px-3 py-2"
            >
              <button
                type="button"
                onClick={() => onSelectIndividual?.(event.individual.id)}
                disabled={!onSelectIndividual}
                className="text-left text-sm font-medium text-[var(--color-brand-600)] hover:underline disabled:cursor-default disabled:text-[var(--color-ink)] disabled:no-underline"
              >
                {event.individual.fullName}
              </button>
              <span className="rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-600)]">
                {EVENT_TYPE_LABEL[event.type]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
