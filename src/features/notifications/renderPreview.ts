// Local, non-persisted preview rendering for the notification settings screen
// (specs/011-email-template-schedule research.md §2). A deliberate, independent
// duplicate of the one-line substitution in
// supabase/functions/send-event-reminders/logic.ts's renderTemplate() — that
// module is Deno-Edge-Function-only and not meant to be imported into the client
// bundle; previewing is cosmetic, not the source of truth for what actually sends.

export interface PreviewSampleVars {
  ten_ca_nhan: string;
  loai_su_kien: string;
  ngay_duong: string;
  ngay_am: string;
  so_ngay_con_lai: string;
}

export const BIRTHDAY_PREVIEW_SAMPLE: PreviewSampleVars = {
  ten_ca_nhan: "Bùi Văn A",
  loai_su_kien: "sinh nhật",
  ngay_duong: "27/7/2026",
  ngay_am: "12/6/2026 âm lịch",
  so_ngay_con_lai: "7",
};

export const DEATH_ANNIVERSARY_PREVIEW_SAMPLE: PreviewSampleVars = {
  ten_ca_nhan: "Bùi Thị B",
  loai_su_kien: "ngày giỗ",
  ngay_duong: "15/8/2026",
  ngay_am: "3/7/2026 âm lịch",
  so_ngay_con_lai: "7",
};

export function renderPreview(template: string, vars: PreviewSampleVars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => vars[key as keyof PreviewSampleVars] ?? match);
}
