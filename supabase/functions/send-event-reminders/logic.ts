// Due-event / dedupe decision logic for the event-reminder Edge Function.
// Deliberately framework-agnostic (no Deno-only or Node-only APIs, no import-alias
// dependency on src/) so it can be imported unchanged by both `index.ts` (Deno) and
// this repo's Vitest suite — see specs/002-lunar-events-tree-slugs/research.md §2 and
// contracts/event-notification-config.md.

export type LifeEventType = "birthday" | "death_anniversary";

/** "advance" = the configured days-before lead-time reminder (existing behavior);
 * "due_today" = a second, separate reminder sent when the event occurs today. */
export type ReminderStage = "advance" | "due_today";

export interface PartialDateInput {
  value: string; // "YYYY-MM-DD"
  precision: "day" | "month" | "year" | "unknown";
}

export interface IndividualInput {
  id: string;
  fullName: string;
  familyTreeId: string;
  birthDate?: PartialDateInput;
  isDeceased: boolean;
  deathDate?: PartialDateInput;
}

export interface NotificationConfigInput {
  enabled: boolean;
  template: string;
  daysBefore: number;
  defaultRecipients: string[];
}

export interface RecipientOverrideInput {
  familyTreeId: string;
  recipients: string[];
}

export interface SentLogEntry {
  individualId: string;
  eventType: LifeEventType;
  eventYear: number;
  reminderStage: ReminderStage;
}

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface DueReminder {
  individualId: string;
  fullName: string;
  eventType: LifeEventType;
  eventYear: number;
  occurrence: CalendarDate;
  daysUntil: number;
  reminderStage: ReminderStage;
  recipients: string[];
  message: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toUtcMillis(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / 86_400_000);
}

/** The next future-or-today occurrence of a recurring month/day, relative to `today`.
 * A Feb 29 birthday clamps to Feb 28 in a non-leap target year rather than being
 * skipped or misdated. */
function nextOccurrence(month: number, day: number, today: CalendarDate): CalendarDate {
  const occursBeforeToday = month < today.month || (month === today.month && day < today.day);
  const year = occursBeforeToday ? today.year + 1 : today.year;
  return { year, month, day: Math.min(day, daysInMonth(year, month)) };
}

function monthDayOf(value: string): { month: number; day: number } {
  const [, month, day] = value.split("-").map(Number);
  return { month, day };
}

function eventTypeLabel(type: LifeEventType): string {
  return type === "birthday" ? "sinh nhật" : "ngày giỗ";
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
}

function resolveRecipients(
  familyTreeId: string,
  defaultRecipients: string[],
  overrides: RecipientOverrideInput[],
): string[] {
  const override = overrides.find((entry) => entry.familyTreeId === familyTreeId);
  return override ? override.recipients : defaultRecipients;
}

function alreadySent(entry: SentLogEntry, log: SentLogEntry[]): boolean {
  return log.some(
    (sent) =>
      sent.individualId === entry.individualId &&
      sent.eventType === entry.eventType &&
      sent.eventYear === entry.eventYear &&
      sent.reminderStage === entry.reminderStage,
  );
}

/**
 * Computes which Life Event occurrences are due for a reminder right now. Each
 * occurrence can produce up to two independent reminders — "advance" (exactly
 * `config.daysBefore` days from `today`, per spec FR-012/FR-013) and "due_today"
 * (the event is today) — each deduped separately against `log` by its own
 * `reminderStage`. When `config.daysBefore` is `0` only "due_today" fires, so the
 * two stages never double-send for the same occurrence. Returns `[]` immediately
 * when `config.enabled` is `false` — the caller (index.ts) is expected to take no
 * further action for an empty result.
 */
export function computeDueReminders(
  individuals: IndividualInput[],
  config: NotificationConfigInput,
  overrides: RecipientOverrideInput[],
  log: SentLogEntry[],
  today: CalendarDate,
  lunarLabel: (date: CalendarDate) => string | null,
): DueReminder[] {
  if (!config.enabled) return [];

  const due: DueReminder[] = [];

  function consider(individual: IndividualInput, type: LifeEventType, date: PartialDateInput | undefined) {
    if (date?.precision !== "day") return;

    const { month, day } = monthDayOf(date.value);
    const occurrence = nextOccurrence(month, day, today);
    const daysUntil = daysBetween(today, occurrence);

    const stages: ReminderStage[] = [];
    if (config.daysBefore > 0 && daysUntil === config.daysBefore) stages.push("advance");
    if (daysUntil === 0) stages.push("due_today");

    for (const stage of stages) {
      const entry: SentLogEntry = { individualId: individual.id, eventType: type, eventYear: occurrence.year, reminderStage: stage };
      if (alreadySent(entry, log)) continue;

      const recipients = resolveRecipients(individual.familyTreeId, config.defaultRecipients, overrides);
      const gregorianLabel = `${occurrence.day}/${occurrence.month}/${occurrence.year}`;
      const lunar = lunarLabel(occurrence);

      const message = renderTemplate(config.template, {
        ten_ca_nhan: individual.fullName,
        loai_su_kien: eventTypeLabel(type),
        ngay_duong: gregorianLabel,
        ngay_am: lunar ?? "không xác định",
        so_ngay_con_lai: String(daysUntil),
      });

      due.push({
        individualId: individual.id,
        fullName: individual.fullName,
        eventType: type,
        eventYear: occurrence.year,
        occurrence,
        daysUntil,
        reminderStage: stage,
        recipients,
        message,
      });
    }
  }

  for (const individual of individuals) {
    consider(individual, "birthday", individual.birthDate);
    if (individual.isDeceased) {
      consider(individual, "death_anniversary", individual.deathDate);
    }
  }

  return due;
}
