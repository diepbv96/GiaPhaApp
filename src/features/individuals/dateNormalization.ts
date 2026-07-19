import type { DatePrecision } from "@/types";

/** A year-only date is stored as Jan 1st of that year, and month-only as the 1st of that
 * month (data-model.md's partial-date convention) — this expands a form input's raw
 * value into that full YYYY-MM-DD before it's sent to the DB. */
export function normalizeDate(value: string, precision: DatePrecision): string {
  if (precision === "year") return `${value}-01-01`;
  if (precision === "month") return `${value}-01`;
  return value;
}

/** Inverse of normalizeDate: the year/month inputs only show/edit the year or year-month
 * portion, so a stored full date must be truncated back down before seeding a form's
 * default value — otherwise re-submitting without touching the field re-expands an
 * already-full date (e.g. "1931-01-01" -> "1931-01-01-01-01"). */
export function denormalizeDate(value: string, precision: DatePrecision): string {
  if (precision === "year") return value.slice(0, 4);
  if (precision === "month") return value.slice(0, 7);
  return value;
}
