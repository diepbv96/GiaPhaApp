// End-to-end coverage of specs/002-lunar-events-tree-slugs/quickstart.md scenarios.
//
// Requires a running Supabase project (local `supabase start` or a test project) with
// this feature's migrations (0013-0015) applied and supabase/seed/seed.sql loaded —
// in particular the seeded "Bùi Văn Cha" (full-precision birth 1955-03-12 and death
// 2023-11-02) and the second, public, non-default "Gia Phả Chi Nhánh Miền Nam (Mẫu)"
// tree. Run with: npm run test:e2e

import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "GiaPha!Test123";
const ACCOUNTS = {
  admin: "admin@giapha.test",
  editor: "editor@giapha.test",
  viewer: "viewer@giapha.test",
};

async function signIn(page: Page, email: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
}

test.describe("User Story 1 - Lunar dates in person detail", () => {
  test("a fully-known birth and death date both show their lunar equivalent", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);

    await page.getByText("Bùi Văn Cha").first().click();
    await expect(page.getByRole("complementary", { name: "Thông tin cá nhân" })).toBeVisible();

    const panel = page.getByRole("complementary", { name: "Thông tin cá nhân" });
    // Inline "DD/MM/YYYY AL" format (specs/003-events-calendar-ui-refinements) — one
    // for the birth date, one for the death date.
    await expect(panel.getByText(/\(\d{2}\/\d{2}\/\d{4} AL\)/)).toHaveCount(2);
  });

  test("a year-only birth date shows no lunar date, just an unavailable note", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);

    await page.getByText("Bùi Văn Tổ").first().click();
    const panel = page.getByRole("complementary", { name: "Thông tin cá nhân" });
    await expect(panel.getByText("(không rõ ngày âm lịch)")).toBeVisible();
  });
});

test.describe("User Story 2 - Upcoming Events calendar", () => {
  test("the calendar shows both calendars per day and highlights a known event day", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);

    await page.getByRole("link", { name: "Sự kiện sắp tới" }).click();
    await expect(page.getByRole("heading", { name: /Tháng \d+ năm \d+/ })).toBeVisible();

    // Navigate to March (Bùi Văn Cha's birthday month), whatever month "today" is.
    const now = new Date();
    const monthsToMarch = (3 - (now.getMonth() + 1) + 12) % 12;
    for (let i = 0; i < monthsToMarch; i++) {
      await page.getByRole("button", { name: "Tháng sau" }).click();
    }
    await expect(page.getByRole("heading", { name: /Tháng 3 năm \d+/ })).toBeVisible();

    // Selecting a date opens a popup over the (now full-width) calendar rather than a
    // permanent side panel (specs/003-events-calendar-ui-refinements).
    const day12 = page.getByRole("button", { name: /Ngày 12, có \d+ sự kiện/ });
    await expect(day12).toBeVisible();
    await day12.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Sinh nhật")).toBeVisible();
    await page.getByRole("button", { name: "✕" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const day1 = page.getByRole("button", { name: "Ngày 1, không có sự kiện" });
    await day1.click();
    await expect(page.getByText("Không có sự kiện nào vào ngày này.")).toBeVisible();
  });

  test("an unauthenticated guest can browse the public default tree's calendar", async ({ page }) => {
    await page.goto("/su-kien-sap-toi");
    await expect(page.getByRole("heading", { name: /Tháng \d+ năm \d+/ })).toBeVisible();
  });
});

test.describe("User Story 2 - Event-reminder settings (Admin)", () => {
  test("admin can update and persist the reminder configuration", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.getByRole("link", { name: "Cấu hình thông báo" }).click();
    await expect(page.getByRole("heading", { name: "Cấu hình thông báo sự kiện" })).toBeVisible();

    await page.getByLabel("Bật gửi email nhắc nhở tự động").check();
    await page.getByLabel("Số ngày báo trước").fill("3");
    await page.getByRole("button", { name: "Lưu cấu hình" }).click();

    await page.reload();
    await expect(page.getByLabel("Bật gửi email nhắc nhở tự động")).toBeChecked();
    await expect(page.getByLabel("Số ngày báo trước")).toHaveValue("3");
  });
});

test.describe("User Story 3 - Shareable tree URLs", () => {
  test("creating a tree auto-generates a slug, which the admin can then edit", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.getByRole("link", { name: "Quản lý cây gia phả" }).click();

    await page.getByPlaceholder(/Gia phả họ Bùi/).fill("Nguyễn Family");
    await page.getByRole("button", { name: "Tạo mới" }).click();
    await expect(page.getByText("/nguyen-family")).toBeVisible();

    await page
      .locator("li", { hasText: "Nguyễn Family" })
      .getByRole("button", { name: "✏️ Sửa slug" })
      .click();
    await page.getByLabel(/Slug \(đường dẫn riêng/).fill("nha-nguyen");
    await page.getByRole("button", { name: "Lưu slug" }).click();
    await expect(page.getByText("/nha-nguyen")).toBeVisible();
  });

  test("guest can open a public, non-default tree directly by its slug", async ({ page }) => {
    await page.goto("/gia-pha-chi-nhanh-mien-nam-mau");
    await expect(page.getByText("Gia Phả Chi Nhánh Miền Nam (Mẫu)")).toBeVisible();
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
  });

  test("guest is denied access to a private tree's slug URL", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.getByRole("link", { name: "Quản lý cây gia phả" }).click();
    await page.getByPlaceholder(/Gia phả họ Bùi/).fill("Cây Riêng Tư Test");
    await page.getByRole("button", { name: "Tạo mới" }).click();
    await expect(page.getByText("/cay-rieng-tu-test")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/cay-rieng-tu-test");
    await expect(page.getByText(/chưa được công khai/)).toBeVisible();
  });

  test("the home page keeps showing only the default tree, unaffected by slug routes", async ({ page }) => {
    await page.goto("/gia-pha-chi-nhanh-mien-nam-mau");
    await page.goto("/");
    await expect(page.getByText("Gia Phả Dòng Họ Bùi (Mẫu)")).toBeVisible();
  });
});

// specs/003-events-calendar-ui-refinements
test.describe("003 US1 - Full navigation and management via slug URL", () => {
  test("admin gets the same sidebar and can manage individuals on a slug-viewed, non-default tree", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto("/gia-pha-chi-nhanh-mien-nam-mau");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });

    // Same sidebar as the home screen: viewing options, management section, account.
    await expect(page.getByRole("link", { name: "Sự kiện sắp tới" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm cá thể" })).toBeVisible();

    await page.getByRole("button", { name: "Thêm cá thể" }).click();
    await page.getByLabel("Họ tên *").fill("Playwright Slug Test Person");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Playwright Slug Test Person")).toBeVisible();

    await page.getByText("Playwright Slug Test Person").first().click();
    await page.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByRole("button", { name: "Xoá" }).click();
    await expect(page.getByText("Playwright Slug Test Person")).toHaveCount(0);
  });

  test("viewer sees the slug-viewed tree's sidebar but no management controls", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    await page.goto("/gia-pha-chi-nhanh-mien-nam-mau");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("link", { name: "Sự kiện sắp tới" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm cá thể" })).toHaveCount(0);
  });

  test("Upcoming Events reached from a slug-viewed tree shows that tree's own events", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    await page.goto("/gia-pha-chi-nhanh-mien-nam-mau");
    await page.getByRole("link", { name: "Sự kiện sắp tới" }).click();
    await expect(page).toHaveURL(/\/gia-pha-chi-nhanh-mien-nam-mau\/su-kien-sap-toi$/);

    const now = new Date();
    const monthsToSeptember = (9 - (now.getMonth() + 1) + 12) % 12;
    for (let i = 0; i < monthsToSeptember; i++) {
      await page.getByRole("button", { name: "Tháng sau" }).click();
    }
    await expect(page.getByRole("button", { name: /Ngày 8, có \d+ sự kiện/ })).toBeVisible();
  });
});

test.describe("003 US4 - Copy updates", () => {
  test("the in-laws toggle and the app's generic name use the updated wording", async ({ page }) => {
    await expect(page).toHaveTitle("Gia Phả App");

    await page.goto("/dang-nhap");
    await expect(page.getByRole("heading", { name: "Gia Phả App" })).toBeVisible();

    await signIn(page, ACCOUNTS.viewer);
    await expect(page.getByText("Ẩn dâu/rễ")).toBeVisible();
  });
});
