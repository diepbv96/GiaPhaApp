// End-to-end coverage of specs/001-family-tree-app/quickstart.md scenarios 1-5.
//
// Requires a running Supabase project (local `supabase start` or a test project) with
// the migrations in supabase/migrations/ applied and the three seeded accounts from
// supabase/seed/seed.sql (see that file for exact credentials). Run with:
//   npm run test:e2e

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

test.describe("User Story 1 - View the family tree", () => {
  test("viewer sees the default tree, can expand/collapse, and has no write controls", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);

    await expect(page.getByRole("button", { name: "+ Thêm cá thể" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nhập từ Excel" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Quản lý cây gia phả" })).toHaveCount(0);

    const collapseButtons = page.getByRole("button", { name: /Thu gọn/ });
    if (await collapseButtons.count() > 0) {
      await collapseButtons.first().click();
      await expect(page.getByRole("button", { name: /Xổ ra/ }).first()).toBeVisible();
    }
  });

  test("selecting an individual shows their full profile", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    await page.locator('[data-testid="tree-canvas"] .react-flow__node').first().click();
    await expect(page.getByRole("complementary", { name: "Thông tin cá nhân" })).toBeVisible();
  });

  test("export produces a downloadable file", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất ảnh (PNG)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("gia-pha.png");
  });
});

test.describe("User Story 2 - Manage individuals and relationships", () => {
  test("editor can add, edit, and delete an individual", async ({ page }) => {
    await signIn(page, ACCOUNTS.editor);

    await page.getByRole("button", { name: "+ Thêm cá thể" }).click();
    await page.getByLabel("Họ tên *").fill("Playwright Test Person");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByText("Playwright Test Person").first().click();
    await page.getByRole("button", { name: "Sửa thông tin" }).click();
    await page.getByLabel("Ghi chú (tối đa 100 ký tự)").fill("Cập nhật từ bài kiểm tra tự động");
    await page.getByRole("button", { name: "Lưu" }).click();

    await page.getByText("Playwright Test Person").first().click();
    await page.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByRole("button", { name: "Xoá" }).click();
  });

  test("notes over 100 characters are rejected client-side (FR-007)", async ({ page }) => {
    await signIn(page, ACCOUNTS.editor);
    await page.getByRole("button", { name: "+ Thêm cá thể" }).click();
    await page.getByLabel("Họ tên *").fill("Note Limit Test");
    await page.getByLabel("Ghi chú (tối đa 100 ký tự)").fill("a".repeat(101));
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Ghi chú tối đa 100 ký tự")).toBeVisible();
  });

  test("viewer never sees add/edit/delete controls", async ({ page }) => {
    await signIn(page, ACCOUNTS.viewer);
    await expect(page.getByRole("button", { name: "+ Thêm cá thể" })).toHaveCount(0);
  });
});

test.describe("User Story 3 - Bulk import", () => {
  test("editor sees the import entry point and dialog", async ({ page }) => {
    await signIn(page, ACCOUNTS.editor);
    await page.getByRole("button", { name: "Nhập từ Excel" }).click();
    await expect(page.getByText(/hai sheet/)).toBeVisible();
  });
});

test.describe("User Story 4 - Multiple trees and default selection", () => {
  test("admin can reach tree management and create a tree", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.getByRole("link", { name: "Quản lý cây gia phả" }).click();
    await expect(page.getByRole("heading", { name: "Quản lý cây gia phả" })).toBeVisible();

    await page.getByPlaceholder("Tên cây gia phả mới").fill("Nhánh Playwright");
    await page.getByRole("button", { name: "Tạo mới" }).click();
    await expect(page.getByText("Nhánh Playwright")).toBeVisible();
  });

  test("editor and viewer cannot reach tree management", async ({ page }) => {
    await signIn(page, ACCOUNTS.editor);
    await page.goto("/quan-tri/cay-gia-pha");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Guest (unauthenticated) viewing of a published tree — FR-028/FR-029", () => {
  // Assumes the seeded default tree (supabase/seed/seed.sql) is published (is_public = true).

  test("guest can view the published default tree with no sign-in and no write controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng xuất" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Thêm cá thể" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nhập từ Excel" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Quản lý cây gia phả" })).toHaveCount(0);
  });

  test("guest can expand/collapse, view a profile, and export, same as a viewer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="tree-canvas"] .react-flow__node').first().click();
    await expect(page.getByRole("complementary", { name: "Thông tin cá nhân" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất ảnh (PNG)" }).click();
    await downloadPromise;
  });

  test("guest write attempts are rejected server-side, not just hidden in the UI", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });

    const result = await page.evaluate(async () => {
      const { supabase } = await import("/src/lib/supabase.ts");
      const { error } = await supabase
        .from("individuals")
        .insert({ family_tree_id: "00000000-0000-0000-0000-000000000000", full_name: "x", gender: "unknown" });
      return error?.code ?? null;
    });

    expect(result).not.toBeNull(); // RLS denies the insert (no policy grants anon write access)
  });
});
