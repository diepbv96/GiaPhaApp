// Daily-scheduled Edge Function: sends one reminder email per due, not-yet-sent Life
// Event occurrence (spec FR-012/FR-013). See
// specs/002-lunar-events-tree-slugs/contracts/event-notification-config.md.
//
// Deployment: `supabase functions deploy send-event-reminders`, then configure a daily
// Supabase Cron Trigger for it (dashboard, or `supabase/config.toml` — see
// supabase/functions/send-event-reminders/.env.example for required secrets).

import { createClient } from "npm:@supabase/supabase-js@2";
import { computeDueReminders, type IndividualInput, type RecipientOverrideInput, type SentLogEntry } from "./logic.ts";
import { toLunarDate } from "../_shared/lunarCalendar.ts";

const RESEND_API_URL = "https://api.resend.com/emails";

interface IndividualRow {
  id: string;
  full_name: string;
  family_tree_id: string;
  birth_date: string | null;
  birth_date_precision: "day" | "month" | "year" | "unknown" | null;
  is_deceased: boolean;
  death_date: string | null;
  death_date_precision: "day" | "month" | "year" | "unknown" | null;
}

function toIndividualInput(row: IndividualRow): IndividualInput {
  return {
    id: row.id,
    fullName: row.full_name,
    familyTreeId: row.family_tree_id,
    birthDate: row.birth_date ? { value: row.birth_date, precision: row.birth_date_precision ?? "unknown" } : undefined,
    isDeceased: row.is_deceased,
    deathDate: row.death_date ? { value: row.death_date, precision: row.death_date_precision ?? "unknown" } : undefined,
  };
}

/** "Today" as a plain calendar date in Vietnam's UTC+7, independent of the server's
 * own timezone (Edge Functions run in UTC). */
function vietnamToday(): { year: number; month: number; day: number } {
  const vietnamNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return {
    year: vietnamNow.getUTCFullYear(),
    month: vietnamNow.getUTCMonth() + 1,
    day: vietnamNow.getUTCDate(),
  };
}

async function sendEmail(fromEmail: string, apiKey: string, to: string[], subject: string, text: string) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to, subject, text }),
  });
  if (!response.ok) {
    throw new Error(`Resend API error ${response.status}: ${await response.text()}`);
  }
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("EVENT_REMINDER_FROM_EMAIL");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const [configResult, overridesResult, individualsResult, logResult] = await Promise.all([
    supabase
      .from("event_notification_config")
      .select("enabled, template, days_before, default_recipients")
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .single(),
    supabase.from("family_tree_notification_recipients").select("family_tree_id, recipients"),
    supabase
      .from("individuals")
      .select("id, full_name, family_tree_id, birth_date, birth_date_precision, is_deceased, death_date, death_date_precision"),
    supabase.from("event_notification_log").select("individual_id, event_type, event_year"),
  ]);

  if (configResult.error) throw configResult.error;
  if (overridesResult.error) throw overridesResult.error;
  if (individualsResult.error) throw individualsResult.error;
  if (logResult.error) throw logResult.error;

  const config = {
    enabled: configResult.data.enabled as boolean,
    template: configResult.data.template as string,
    daysBefore: configResult.data.days_before as number,
    defaultRecipients: configResult.data.default_recipients as string[],
  };

  const overrides: RecipientOverrideInput[] = (overridesResult.data ?? []).map((row) => ({
    familyTreeId: row.family_tree_id as string,
    recipients: row.recipients as string[],
  }));

  const individuals: IndividualInput[] = (individualsResult.data as IndividualRow[]).map(toIndividualInput);

  const log: SentLogEntry[] = (logResult.data ?? []).map((row) => ({
    individualId: row.individual_id as string,
    eventType: row.event_type as SentLogEntry["eventType"],
    eventYear: row.event_year as number,
  }));

  const dueReminders = computeDueReminders(individuals, config, overrides, log, vietnamToday(), (date) => {
    const lunar = toLunarDate(date);
    return lunar ? `${lunar.day}/${lunar.month}${lunar.isLeapMonth ? " (nhuận)" : ""}/${lunar.year} âm lịch` : null;
  });

  let sent = 0;
  const failures: string[] = [];

  for (const reminder of dueReminders) {
    if (reminder.recipients.length === 0) continue;

    try {
      if (resendApiKey && fromEmail) {
        await sendEmail(
          fromEmail,
          resendApiKey,
          reminder.recipients,
          `Nhắc nhở: ${reminder.fullName} sắp có sự kiện`,
          reminder.message,
        );
      }

      const { error: insertError } = await supabase.from("event_notification_log").insert({
        individual_id: reminder.individualId,
        event_type: reminder.eventType,
        event_year: reminder.eventYear,
      });
      if (insertError) throw insertError;

      sent += 1;
    } catch (err) {
      // Deliberately does not write a log row on failure — this occurrence is
      // naturally retried on tomorrow's run instead of being silently skipped
      // (contracts/event-notification-config.md "Failure handling").
      failures.push(`${reminder.individualId}/${reminder.eventType}/${reminder.eventYear}: ${err}`);
    }
  }

  return new Response(JSON.stringify({ due: dueReminders.length, sent, failures }), {
    headers: { "Content-Type": "application/json" },
  });
});
