// Front-end-only predefined template options for the notification settings screen
// (specs/011-email-template-schedule FR-001/FR-002). Deliberately not persisted
// anywhere — picking one just pre-fills the existing, already-persisted
// `event_notification_config.template` free-text field (see
// NotificationSettingsPanel.tsx). Each entry's wording is generic across event
// types: it only ever refers to the event via {{loai_su_kien}}, which
// send-event-reminders/logic.ts already fills with "sinh nhật" or "ngày giỗ" as
// appropriate, so every option here reads correctly for both.

export interface PredefinedEmailTemplate {
  id: string;
  label: string;
  content: string;
}

export const PREDEFINED_EMAIL_TEMPLATES: PredefinedEmailTemplate[] = [
  {
    id: "formal",
    label: "Trang trọng",
    content:
      "Kính báo: {{ten_ca_nhan}} sẽ có {{loai_su_kien}} vào ngày {{ngay_duong}} ({{ngay_am}}), còn {{so_ngay_con_lai}} ngày nữa. Kính mong cả nhà cùng ghi nhớ.",
  },
  {
    id: "warm",
    label: "Gần gũi",
    content:
      "Chào cả nhà! {{loai_su_kien}} của {{ten_ca_nhan}} sẽ đến vào {{ngay_duong}} ({{ngay_am}}) — còn {{so_ngay_con_lai}} ngày nữa thôi. Đừng quên nha!",
  },
  {
    id: "short",
    label: "Ngắn gọn",
    content: "{{ten_ca_nhan}} — {{loai_su_kien}} vào {{ngay_duong}} ({{ngay_am}}). Còn {{so_ngay_con_lai}} ngày.",
  },
];
