import { describe, expect, it } from "vitest";
import {
  BIRTHDAY_PREVIEW_SAMPLE,
  DEATH_ANNIVERSARY_PREVIEW_SAMPLE,
  renderPreview,
} from "../../src/features/notifications/renderPreview";
import { PREDEFINED_EMAIL_TEMPLATES } from "../../src/features/notifications/predefinedTemplates";

describe("renderPreview", () => {
  it("substitutes every placeholder for the birthday sample", () => {
    const rendered = renderPreview(
      "{{ten_ca_nhan}} - {{loai_su_kien}} - {{ngay_duong}} - {{ngay_am}} - {{so_ngay_con_lai}}",
      BIRTHDAY_PREVIEW_SAMPLE,
    );
    expect(rendered).not.toContain("{{");
    expect(rendered).toContain("sinh nhật");
  });

  it("substitutes every placeholder for the death-anniversary sample", () => {
    const rendered = renderPreview(
      "{{ten_ca_nhan}} - {{loai_su_kien}} - {{ngay_duong}} - {{ngay_am}} - {{so_ngay_con_lai}}",
      DEATH_ANNIVERSARY_PREVIEW_SAMPLE,
    );
    expect(rendered).not.toContain("{{");
    expect(rendered).toContain("ngày giỗ");
  });

  it("leaves an unknown placeholder untouched", () => {
    const rendered = renderPreview("{{khong_ton_tai}}", BIRTHDAY_PREVIEW_SAMPLE);
    expect(rendered).toBe("{{khong_ton_tai}}");
  });

  describe("every predefined template", () => {
    for (const template of PREDEFINED_EMAIL_TEMPLATES) {
      it(`"${template.label}" renders with no leftover placeholders for both event types`, () => {
        const birthday = renderPreview(template.content, BIRTHDAY_PREVIEW_SAMPLE);
        const deathAnniversary = renderPreview(template.content, DEATH_ANNIVERSARY_PREVIEW_SAMPLE);
        expect(birthday).not.toContain("{{");
        expect(deathAnniversary).not.toContain("{{");
      });
    }
  });
});
