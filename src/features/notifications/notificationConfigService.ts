import { supabase } from "@/lib/supabase";
import { DataAccessError, type EventNotificationConfig, type NotificationRecipientsOverride } from "@/types";

const CONFIG_ID = "00000000-0000-0000-0000-000000000000";
const CONFIG_COLUMNS = "enabled, template, days_before, default_recipients";

interface EventNotificationConfigRow {
  enabled: boolean;
  template: string;
  days_before: number;
  default_recipients: string[];
}

interface NotificationRecipientsOverrideRow {
  family_tree_id: string;
  recipients: string[];
}

function mapConfigRow(row: EventNotificationConfigRow): EventNotificationConfig {
  return {
    enabled: row.enabled,
    template: row.template,
    daysBefore: row.days_before,
    defaultRecipients: row.default_recipients,
  };
}

function toDataAccessError(error: { code?: string }): DataAccessError {
  if (error.code === "42501") {
    return new DataAccessError("PERMISSION_DENIED", "Chỉ quản trị viên mới có thể thay đổi cấu hình thông báo.");
  }
  if (error.code === "23514") {
    return new DataAccessError("VALIDATION_FAILED", "Dữ liệu cấu hình không hợp lệ. Vui lòng kiểm tra lại.");
  }
  return new DataAccessError("UNKNOWN", "Đã xảy ra lỗi. Vui lòng thử lại.");
}

export async function getConfig(): Promise<EventNotificationConfig> {
  const { data, error } = await supabase
    .from("event_notification_config")
    .select(CONFIG_COLUMNS)
    .eq("id", CONFIG_ID)
    .single();

  if (error || !data) throw toDataAccessError(error ?? {});
  return mapConfigRow(data as EventNotificationConfigRow);
}

export async function updateConfig(
  input: Partial<Pick<EventNotificationConfig, "enabled" | "template" | "daysBefore" | "defaultRecipients">>,
  updatedBy: string,
): Promise<EventNotificationConfig> {
  const { data, error } = await supabase
    .from("event_notification_config")
    .update({
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.template !== undefined ? { template: input.template } : {}),
      ...(input.daysBefore !== undefined ? { days_before: input.daysBefore } : {}),
      ...(input.defaultRecipients !== undefined ? { default_recipients: input.defaultRecipients } : {}),
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", CONFIG_ID)
    .select(CONFIG_COLUMNS)
    .single();

  if (error || !data) throw toDataAccessError(error ?? {});
  return mapConfigRow(data as EventNotificationConfigRow);
}

export async function getRecipientOverride(familyTreeId: string): Promise<NotificationRecipientsOverride | null> {
  const { data, error } = await supabase
    .from("family_tree_notification_recipients")
    .select("family_tree_id, recipients")
    .eq("family_tree_id", familyTreeId)
    .maybeSingle();

  if (error) throw toDataAccessError(error);
  if (!data) return null;

  const row = data as NotificationRecipientsOverrideRow;
  return { familyTreeId: row.family_tree_id, recipients: row.recipients };
}

export async function setRecipientOverride(
  familyTreeId: string,
  recipients: string[],
  updatedBy: string,
): Promise<NotificationRecipientsOverride> {
  const { data, error } = await supabase
    .from("family_tree_notification_recipients")
    .upsert({ family_tree_id: familyTreeId, recipients, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .select("family_tree_id, recipients")
    .single();

  if (error || !data) throw toDataAccessError(error ?? {});
  const row = data as NotificationRecipientsOverrideRow;
  return { familyTreeId: row.family_tree_id, recipients: row.recipients };
}

export async function clearRecipientOverride(familyTreeId: string): Promise<void> {
  const { error } = await supabase
    .from("family_tree_notification_recipients")
    .delete()
    .eq("family_tree_id", familyTreeId);

  if (error) throw toDataAccessError(error);
}
