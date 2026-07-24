import { describe, expect, it } from "vitest";
import {
  computeDueReminders,
  type IndividualInput,
  type NotificationConfigInput,
} from "../../supabase/functions/send-event-reminders/logic.ts";

const today = { year: 2026, month: 7, day: 20 };

const baseConfig: NotificationConfigInput = {
  enabled: true,
  template: "{{ten_ca_nhan}} có {{loai_su_kien}} vào {{ngay_duong}} (còn {{so_ngay_con_lai}} ngày)",
  daysBefore: 7,
  defaultRecipients: ["admin@example.com"],
};

function individual(overrides: Partial<IndividualInput> & Pick<IndividualInput, "id" | "fullName">): IndividualInput {
  return { familyTreeId: "tree-1", isDeceased: false, ...overrides };
}

const noLunar = () => null;

describe("computeDueReminders", () => {
  it("returns nothing when notifications are disabled", () => {
    const person = individual({ id: "p1", fullName: "A", birthDate: { value: "1990-07-27", precision: "day" } });
    const due = computeDueReminders([person], { ...baseConfig, enabled: false }, [], [], today, noLunar);
    expect(due).toEqual([]);
  });

  it("flags a birthday exactly `daysBefore` days away", () => {
    // today + 7 days = 2026-07-27
    const person = individual({ id: "p1", fullName: "Bùi Văn A", birthDate: { value: "1990-07-27", precision: "day" } });
    const due = computeDueReminders([person], baseConfig, [], [], today, noLunar);

    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      individualId: "p1",
      eventType: "birthday",
      eventYear: 2026,
      daysUntil: 7,
      reminderStage: "advance",
    });
    expect(due[0].message).toContain("Bùi Văn A");
  });

  it("also flags a birthday that falls today, as a separate `due_today` reminder", () => {
    const person = individual({ id: "p1", fullName: "Bùi Văn A", birthDate: { value: "1990-07-20", precision: "day" } });
    const due = computeDueReminders([person], baseConfig, [], [], today, noLunar);

    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ individualId: "p1", eventType: "birthday", eventYear: 2026, daysUntil: 0, reminderStage: "due_today" });
  });

  it("sends both an advance and a due_today reminder independently once each becomes due, without double-sending", () => {
    const person = individual({ id: "p1", fullName: "A", birthDate: { value: "1990-07-27", precision: "day" } });

    const advanceDue = computeDueReminders([person], baseConfig, [], [], today, noLunar);
    expect(advanceDue).toHaveLength(1);
    expect(advanceDue[0].reminderStage).toBe("advance");

    const advanceLog = [{ individualId: "p1", eventType: "birthday" as const, eventYear: 2026, reminderStage: "advance" as const }];

    // Still 7 days out from the same log state -> already sent, nothing due.
    expect(computeDueReminders([person], baseConfig, [], advanceLog, today, noLunar)).toEqual([]);

    // Move forward to the day itself: the advance log entry doesn't block the due_today stage.
    const eventDay = { year: 2026, month: 7, day: 27 };
    const dueTodayDue = computeDueReminders([person], baseConfig, [], advanceLog, eventDay, noLunar);
    expect(dueTodayDue).toHaveLength(1);
    expect(dueTodayDue[0]).toMatchObject({ daysUntil: 0, reminderStage: "due_today" });
  });

  it("does not flag an event further away than the configured window", () => {
    const person = individual({ id: "p1", fullName: "A", birthDate: { value: "1990-08-15", precision: "day" } });
    const due = computeDueReminders([person], baseConfig, [], [], today, noLunar);
    expect(due).toEqual([]);
  });

  it("never flags a death anniversary for someone not marked deceased", () => {
    const person = individual({
      id: "p1",
      fullName: "A",
      isDeceased: false,
      deathDate: { value: "1990-07-27", precision: "day" },
    });
    const due = computeDueReminders([person], baseConfig, [], [], today, noLunar);
    expect(due).toEqual([]);
  });

  it("skips an occurrence already recorded in the log (no duplicate sends)", () => {
    const person = individual({ id: "p1", fullName: "A", birthDate: { value: "1990-07-27", precision: "day" } });
    const log = [{ individualId: "p1", eventType: "birthday" as const, eventYear: 2026, reminderStage: "advance" as const }];
    const due = computeDueReminders([person], baseConfig, [], log, today, noLunar);
    expect(due).toEqual([]);
  });

  it("uses a family tree's recipient override instead of the default list", () => {
    const person = individual({
      id: "p1",
      fullName: "A",
      familyTreeId: "tree-2",
      birthDate: { value: "1990-07-27", precision: "day" },
    });
    const overrides = [{ familyTreeId: "tree-2", recipients: ["custom@example.com"] }];
    const due = computeDueReminders([person], baseConfig, overrides, [], today, noLunar);
    expect(due[0].recipients).toEqual(["custom@example.com"]);
  });

  it("clamps a Feb 29 birthday to Feb 28 when the target year is not a leap year", () => {
    const person = individual({ id: "p1", fullName: "A", birthDate: { value: "1992-02-29", precision: "day" } });
    // From 2026-07-20, the next Feb 29 birthday lands in 2027 (not a leap year) -> Feb 28, 2027.
    const due = computeDueReminders(
      [person],
      { ...baseConfig, daysBefore: 0 },
      [],
      [],
      { year: 2027, month: 2, day: 28 },
      noLunar,
    );
    expect(due).toHaveLength(1);
    expect(due[0].occurrence).toEqual({ year: 2027, month: 2, day: 28 });
  });
});
