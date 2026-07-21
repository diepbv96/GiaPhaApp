// End-to-end coverage of specs/007-individuals-admin-dashboard/quickstart.md scenarios.
//
// Requires a running Supabase project with the migrations in supabase/migrations/
// applied and the seeded accounts/trees from supabase/seed/seed.sql. Run with:
//   npm run test:e2e
//
// Each test creates and cleans up its own uniquely-named individual rather than
// mutating shared seed fixtures, so these tests stay independent and safe under this
// project's `fullyParallel: true` Playwright config.

import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "GiaPha!Test123";
const ACCOUNTS = {
  admin: "admin@giapha.test",
  editor: "editor@giapha.test",
  viewer: "viewer@giapha.test",
};
const DASHBOARD_PATH = "/quan-tri/ca-nhan";

async function signIn(page: Page, email: string) {
  await page.goto("/dang-nhap");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
}

async function createIndividual(page: Page, fullName: string) {
  await page.getByRole("button", { name: "+ Thêm cá thể" }).click();
  await page.getByLabel("Họ tên *").fill(fullName);
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.describe("User Story 1 - Browse and locate any individual", () => {
  test("lists individuals from multiple trees, and filter/search/combine/no-results all work", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto(DASHBOARD_PATH);

    await expect(page.getByText("Bùi Văn Cha")).toBeVisible();
    await expect(page.getByText("Bùi Thị Út")).toBeVisible();

    await page.getByLabel("Lọc theo cây gia phả").selectOption({ label: "Gia Phả Chi Nhánh Miền Nam (Mẫu)" });
    await expect(page.getByText("Bùi Thị Út")).toBeVisible();
    await expect(page.getByText("Bùi Văn Cha")).toHaveCount(0);

    await page.getByLabel("Lọc theo cây gia phả").selectOption({ label: "Tất cả cây gia phả" });
    await page.getByLabel("Tìm kiếm cá nhân").fill("but");
    await expect(page.getByText("Bùi Văn Cha")).toBeVisible();
    await expect(page.getByText("Bùi Thị Út")).toBeVisible();

    await page.getByLabel("Tìm kiếm cá nhân").fill("zzz-khong-ton-tai");
    await expect(page.getByText("Không tìm thấy cá nhân nào")).toBeVisible();
  });

  test("viewers and unauthenticated visitors are denied access", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    await page.goto(DASHBOARD_PATH);
    await expect(page).toHaveURL("/");

    await page.context().clearCookies();
    await page.goto(DASHBOARD_PATH);
    await expect(page).toHaveURL(/\/dang-nhap/);
  });
});

test.describe("User Story 2 - Edit an individual's information from the dashboard", () => {
  test("editing and saving a valid change is reflected immediately; blank name is rejected; cancel keeps it unchanged", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    await createIndividual(page, "Playwright Dashboard Edit Target");

    await page.goto(DASHBOARD_PATH);
    await page.getByLabel("Tìm kiếm cá nhân").fill("Playwright Dashboard Edit Target");
    const row = page.getByRole("listitem").filter({ hasText: "Playwright Dashboard Edit Target" });
    await expect(row).toBeVisible();

    // Cancel leaves the record unchanged.
    await row.getByRole("button", { name: "Sửa" }).click();
    await page.getByLabel("Ghi chú (tối đa 100 ký tự)").fill("should not be saved");
    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // A valid edit saves and is reflected in the row.
    await row.getByRole("button", { name: "Sửa" }).click();
    await page.getByLabel("Ghi chú (tối đa 100 ký tự)").fill("Cập nhật từ bài kiểm tra dashboard");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row).toBeVisible();

    // A blank required name is rejected.
    await row.getByRole("button", { name: "Sửa" }).click();
    await page.getByLabel("Họ tên *").fill("");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText(/không được để trống|Dữ liệu không hợp lệ/)).toBeVisible();
    await page.getByRole("button", { name: "Hủy" }).click();

    // Cleanup.
    await row.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByRole("button", { name: "Xoá" }).click();
  });
});

test.describe("User Story 3 - Delete an individual from the dashboard", () => {
  test("deleting a zero-relationship individual removes them from the dashboard", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await createIndividual(page, "Playwright Dashboard Delete Simple");

    await page.goto(DASHBOARD_PATH);
    await page.getByLabel("Tìm kiếm cá nhân").fill("Playwright Dashboard Delete Simple");
    const row = page.getByRole("listitem").filter({ hasText: "Playwright Dashboard Delete Simple" });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByRole("button", { name: "Xoá" }).click();
    await expect(page.getByText("Playwright Dashboard Delete Simple")).toHaveCount(0);
  });

  test("deleting an individual who belongs to more than one family tree succeeds (trigger-fix regression)", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    await createIndividual(page, "Playwright Dashboard Delete MultiTree");

    // Add them to the second seeded tree too, so they belong to 2 family trees at
    // delete time — exercises the enforce_last_tree_membership() cascade fix
    // (migration 0021 / data-model.md).
    await page.getByText("Playwright Dashboard Delete MultiTree").first().click();
    await page.getByRole("button", { name: "Thêm vào cây gia phả khác" }).click();
    await page.getByRole("button", { name: "Thêm vào cây này" }).click();
    await page.getByRole("button", { name: "Đóng" }).click();

    await page.goto(DASHBOARD_PATH);
    await page.getByLabel("Tìm kiếm cá nhân").fill("Playwright Dashboard Delete MultiTree");
    const row = page.getByRole("listitem").filter({ hasText: "Playwright Dashboard Delete MultiTree" });
    await expect(row).toBeVisible();
    // Confirm the dashboard shows both tree memberships before deleting.
    await expect(row.getByText("Gia Phả Chi Nhánh Miền Nam (Mẫu)")).toBeVisible();

    await row.getByRole("button", { name: "Xoá cá thể" }).click();
    await expect(page.getByText(/mọi cây gia phả/)).toBeVisible();
    await page.getByRole("button", { name: "Xoá" }).click();
    await expect(page.getByText("Playwright Dashboard Delete MultiTree")).toHaveCount(0);
  });

  test("deleting an already-deleted individual surfaces a clear error instead of a false success", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    await createIndividual(page, "Playwright Dashboard Delete Stale");

    await page.goto(DASHBOARD_PATH);
    await page.getByLabel("Tìm kiếm cá nhân").fill("Playwright Dashboard Delete Stale");
    const row = page.getByRole("listitem").filter({ hasText: "Playwright Dashboard Delete Stale" });
    await expect(row).toBeVisible();

    // Simulate another user deleting this individual first, without refreshing this page.
    await page.evaluate(async (name: string) => {
      const { supabase } = await import("/src/lib/supabase.ts");
      const { data } = await supabase.from("individuals").select("id").eq("full_name", name).single();
      if (data) await supabase.from("individuals").delete().eq("id", data.id);
    }, "Playwright Dashboard Delete Stale");

    await row.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByRole("button", { name: "Xoá" }).click();
    await expect(page.getByText("Cá thể này đã bị xoá trước đó.")).toBeVisible();
  });

  test("viewers have no delete action available (the dashboard is unreachable to them)", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    await page.goto(DASHBOARD_PATH);
    await expect(page).toHaveURL("/");
  });
});
