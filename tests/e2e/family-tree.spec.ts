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

// specs/008-display-unconnected-individuals/quickstart.md
//
// Each test below creates and cleans up its own uniquely-named individual rather than
// mutating shared seed fixtures ("Bùi Văn Cha"/"Bùi Thị Út"), so these tests stay
// independent and safe under this project's `fullyParallel: true` Playwright config.
test.describe("Spec 008 - Isolated individuals remain visible and actionable", () => {
  test("a brand-new individual with no relationship is shown on the canvas, not hidden (FR-001/FR-003)", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);

    await page.getByRole("button", { name: "+ Thêm cá thể" }).click();
    await page.getByLabel("Họ tên *").fill("Playwright Isolated Person");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Present immediately with zero relationships — this is exactly the case that used
    // to be silently excluded from the canvas before this feature.
    await expect(page.getByText("Playwright Isolated Person")).toBeVisible();

    // Cleanup.
    await page.getByText("Playwright Isolated Person").first().click();
    await page.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByRole("button", { name: "Xoá" }).click();
  });

  test("an isolated individual is visually distinct and remains fully selectable — add-relationship and delete both work (FR-005/FR-006/FR-007)", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);

    await page.getByRole("button", { name: "+ Thêm cá thể" }).click();
    await page.getByLabel("Họ tên *").fill("Playwright Isolated Actionable");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const isolatedCard = page.locator(".react-flow__node", { hasText: "Playwright Isolated Actionable" });
    await expect(isolatedCard.getByText("Chưa có mối quan hệ")).toBeVisible();

    await isolatedCard.click();
    await expect(page.getByRole("complementary", { name: "Thông tin cá nhân" })).toBeVisible();

    // Add-relationship works identically to any other individual — the form defaults to
    // "parent_child" with the selected (isolated) individual as person A, so link them
    // as parent of the seeded "Bùi Văn Cha" ("Con" = person B for this type).
    await page.getByRole("button", { name: "Thêm mối quan hệ" }).click();
    await page.getByLabel("Con").selectOption({ label: "Bùi Văn Cha" });
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(isolatedCard.getByText("Chưa có mối quan hệ")).toHaveCount(0);

    // Cleanup — deleting the individual also removes the relationship just created.
    await isolatedCard.click();
    await page.getByRole("button", { name: "Xoá cá thể" }).click();
    await page.getByText("Tôi hiểu và muốn xoá cả các mối quan hệ liên quan").click();
    await page.getByRole("button", { name: "Xoá" }).click();
  });

  test("a viewer sees an isolated individual with the same visual marker but no action controls (FR-009)", async ({
    page,
  }) => {
    // "Bùi Thị Út" (second seeded tree) has zero relationships by default — read-only
    // check, no fixture mutation needed. Viewers have no in-app link to a non-default
    // tree (only admin/editor fetch the tree switcher list), so read its slug directly
    // via the same Supabase client the app itself uses, then navigate there — this is a
    // read a viewer's own RLS policies already permit (public tree metadata).
    await signIn(page, ACCOUNTS.viewer);

    const slug = await page.evaluate(async () => {
      const { supabase } = await import("/src/lib/supabase.ts");
      const { data } = await supabase
        .from("family_trees")
        .select("slug")
        .eq("name", "Gia Phả Chi Nhánh Miền Nam (Mẫu)")
        .single();
      return data?.slug ?? null;
    });
    expect(slug).not.toBeNull();

    await page.goto(`/${slug}`);
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });

    const isolatedCard = page.locator(".react-flow__node", { hasText: "Bùi Thị Út" });
    await expect(isolatedCard.getByText("Chưa có mối quan hệ")).toBeVisible();

    await isolatedCard.click();
    await expect(page.getByRole("complementary", { name: "Thông tin cá nhân" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm mối quan hệ" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Xoá cá thể" })).toHaveCount(0);
  });
});

// specs/009-cross-tree-relationships/quickstart.md
//
// Reuses the seeded second tree ("Gia Phả Chi Nhánh Miền Nam (Mẫu)") as "tree 2" for
// every test below instead of creating a new one — both seeded trees are already public
// (supabase/seed/seed.sql), so this also gives the guest-parity check a public tree to
// view with no is_public toggling needed, and avoids ever approaching the app's 5-tree
// limit (0003_family_trees.sql) under this project's `fullyParallel: true` config. Each
// test still creates and cleans up its own uniquely-named individuals, never touching the
// seeded ones.
const SECOND_TREE_NAME = "Gia Phả Chi Nhánh Miền Nam (Mẫu)";

async function getSecondTreeSlug(page: Page): Promise<string> {
  const slug = await page.evaluate(async (name) => {
    const { supabase } = await import("/src/lib/supabase.ts");
    const { data } = await supabase.from("family_trees").select("slug").eq("name", name).single();
    return data?.slug ?? null;
  }, SECOND_TREE_NAME);
  expect(slug).not.toBeNull();
  return slug as string;
}

async function createIndividual(page: Page, fullName: string) {
  await page.getByRole("button", { name: "+ Thêm cá thể" }).click();
  await page.getByLabel("Họ tên *").fill(fullName);
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function createSpouseRelationship(page: Page, personAName: string, personBName: string) {
  await page.getByText(personAName).first().click();
  await page.getByRole("button", { name: "Thêm mối quan hệ" }).click();
  await page.getByLabel("Loại quan hệ").selectOption("spouse");
  await page.getByLabel("Cá thể thứ nhất").selectOption({ label: personAName });
  await page.getByLabel("Cá thể thứ hai").selectOption({ label: personBName });
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function addToSecondTree(page: Page, fullName: string) {
  await page.getByText(fullName).first().click();
  await page.getByRole("button", { name: "Thêm vào cây gia phả khác" }).click();
  await page.locator("li", { hasText: SECOND_TREE_NAME }).getByRole("button", { name: "Thêm vào cây này" }).click();
  await page.getByRole("button", { name: "Đóng" }).click();
}

/** Deletes an individual system-wide from wherever it's currently visible, confirming
 * the relationship-cascade checkbox only if it's shown (spec 007's `deleteIndividual` is
 * always a full, every-tree delete). */
async function deleteIndividualEverywhere(page: Page, fullName: string) {
  await page.getByText(fullName).first().click();
  await page.getByRole("button", { name: "Xoá cá thể" }).click();
  const cascadeCheckbox = page.getByText("Tôi hiểu và muốn xoá cả các mối quan hệ liên quan");
  if (await cascadeCheckbox.count() > 0) {
    await cascadeCheckbox.click();
  }
  await page.getByRole("button", { name: "Xoá" }).click();
}

test.describe("Spec 009 - Cross-tree relationship visibility", () => {
  test("a relationship recorded in tree 1 becomes visible in tree 2 once both individuals are added there, for both authenticated users and guests (FR-001/FR-002/US1)", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const secondTreeSlug = await getSecondTreeSlug(page);

    const nameA = "Playwright CrossTree A";
    const nameB = "Playwright CrossTree B";
    await createIndividual(page, nameA);
    await createIndividual(page, nameB);
    await createSpouseRelationship(page, nameA, nameB);

    await addToSecondTree(page, nameA);
    await addToSecondTree(page, nameB);

    // Tree 2: the relationship must appear without being recreated.
    await page.goto(`/${secondTreeSlug}`);
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    const cardAInTree2 = page.locator(".react-flow__node", { hasText: nameA });
    await expect(cardAInTree2.getByText("Chưa có mối quan hệ")).toHaveCount(0);
    await cardAInTree2.click();
    await page.getByRole("button", { name: /Gia đình/ }).click();
    await expect(page.getByRole("complementary", { name: "Thông tin cá nhân" }).getByRole("button", { name: nameB })).toBeVisible();

    // Tree 1 (default): still shown exactly as before.
    await page.goto("/");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    const cardAInTree1 = page.locator(".react-flow__node", { hasText: nameA });
    await expect(cardAInTree1.getByText("Chưa có mối quan hệ")).toHaveCount(0);

    // Guest parity: an unauthenticated viewer of the public tree 2 sees the same thing.
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.goto(`/${secondTreeSlug}`);
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    const cardAAsGuest = page.locator(".react-flow__node", { hasText: nameA });
    await expect(cardAAsGuest.getByText("Chưa có mối quan hệ")).toHaveCount(0);

    // Cleanup — sign back in and delete both (cascades the relationship, all trees).
    await signIn(page, ACCOUNTS.admin);
    await deleteIndividualEverywhere(page, nameA);
    await deleteIndividualEverywhere(page, nameB);
  });

  test("a relationship stays hidden in tree 2 until both individuals are members (FR-004/US2)", async ({ page }) => {
    await signIn(page, ACCOUNTS.admin);
    const secondTreeSlug = await getSecondTreeSlug(page);

    const nameC = "Playwright CrossTree C";
    const nameD = "Playwright CrossTree D";
    await createIndividual(page, nameC);
    await createIndividual(page, nameD);
    await createSpouseRelationship(page, nameC, nameD);

    // Only C is added to tree 2.
    await addToSecondTree(page, nameC);

    await page.goto(`/${secondTreeSlug}`);
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    const cardCInTree2 = page.locator(".react-flow__node", { hasText: nameC });
    await expect(cardCInTree2.getByText("Chưa có mối quan hệ")).toBeVisible();
    await expect(page.getByText(nameD)).toHaveCount(0);

    // Adding D too makes the relationship appear immediately.
    await addToSecondTree(page, nameD);
    await page.goto(`/${secondTreeSlug}`);
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    const cardCInTree2Again = page.locator(".react-flow__node", { hasText: nameC });
    await expect(cardCInTree2Again.getByText("Chưa có mối quan hệ")).toHaveCount(0);

    await deleteIndividualEverywhere(page, nameC);
    await deleteIndividualEverywhere(page, nameD);
  });

  test("removing a shared membership from tree 2 doesn't affect the relationship still valid in tree 1 (FR-006/US3)", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const secondTreeSlug = await getSecondTreeSlug(page);

    const nameE = "Playwright CrossTree E";
    const nameF = "Playwright CrossTree F";
    await createIndividual(page, nameE);
    await createIndividual(page, nameF);
    await createSpouseRelationship(page, nameE, nameF);

    await addToSecondTree(page, nameE);
    await addToSecondTree(page, nameF);

    // Remove E's membership from tree 2 only — must succeed directly, with no
    // relationship-cascade confirmation prompt, since the relationship was recorded in
    // tree 1 (the default tree), not tree 2 (research.md §4).
    await page.getByText(nameE).first().click();
    await page.getByRole("button", { name: "Thêm vào cây gia phả khác" }).click();
    await page.locator("li", { hasText: SECOND_TREE_NAME }).getByRole("button", { name: "Xoá khỏi cây này" }).click();
    // If removal were blocked (it shouldn't be — research.md §4), the same <li> would
    // persist showing the cascade-confirmation prompt instead of disappearing, so this
    // single assertion both waits for the mutation to settle and verifies the outcome.
    await expect(page.locator("li", { hasText: SECOND_TREE_NAME })).toHaveCount(0);
    await page.getByRole("button", { name: "Đóng" }).click();

    // Tree 1: relationship between E and F is unchanged.
    await page.goto("/");
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    const cardEInTree1 = page.locator(".react-flow__node", { hasText: nameE });
    await expect(cardEInTree1.getByText("Chưa có mối quan hệ")).toHaveCount(0);

    // Tree 2: E is gone entirely; F remains (still a member).
    await page.goto(`/${secondTreeSlug}`);
    await expect(page.getByTestId("tree-canvas")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(nameE)).toHaveCount(0);
    await expect(page.getByText(nameF)).toBeVisible();

    await deleteIndividualEverywhere(page, nameE);
    await deleteIndividualEverywhere(page, nameF);
  });
});

// specs/010-hide-inlaw-relatives/quickstart.md
//
// Builds the exact scenario quickstart.md describes: a blood-line child of the seeded
// "Bùi Văn Cha", that child's in-law spouse, the in-law's exclusive child and
// grandchild, and a child shared between the couple. Creates and cleans up its own
// individuals only, never touching seed fixtures beyond reading "Bùi Văn Cha" by name.
async function createTypedRelationship(
  page: Page,
  type: "parent_child" | "spouse",
  personAName: string,
  personBName: string,
) {
  await page.getByText(personAName).first().click();
  await page.getByRole("button", { name: "Thêm mối quan hệ" }).click();
  await page.getByLabel("Loại quan hệ").selectOption(type);
  const labelA = type === "parent_child" ? "Cha/Mẹ" : "Cá thể thứ nhất";
  const labelB = type === "parent_child" ? "Con" : "Cá thể thứ hai";
  await page.getByLabel(labelA).selectOption({ label: personAName });
  await page.getByLabel(labelB).selectOption({ label: personBName });
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test.describe("Spec 010 - Cascade-hide in-law-only relatives", () => {
  test("an in-law's exclusive descendants are hidden with the toggle, a shared child stays visible, and turning it off restores everyone", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);

    const son = "Playwright InLaw Son";
    const spouse = "Playwright InLaw Spouse";
    const stepchild = "Playwright InLaw Stepchild";
    const stepgrandchild = "Playwright InLaw Stepgrandchild";
    const sharedchild = "Playwright InLaw SharedChild";

    for (const name of [son, spouse, stepchild, stepgrandchild, sharedchild]) {
      await createIndividual(page, name);
    }

    await createTypedRelationship(page, "parent_child", "Bùi Văn Cha", son);
    await createTypedRelationship(page, "spouse", son, spouse);
    await createTypedRelationship(page, "parent_child", spouse, stepchild);
    await createTypedRelationship(page, "parent_child", stepchild, stepgrandchild);
    await createTypedRelationship(page, "parent_child", son, sharedchild);
    await createTypedRelationship(page, "parent_child", spouse, sharedchild);

    // Toggle off (default): everyone visible.
    for (const name of [son, spouse, stepchild, stepgrandchild, sharedchild]) {
      await expect(page.getByText(name)).toBeVisible();
    }

    // Enable "Ẩn dâu/rễ": the in-law and both of her exclusive descendants disappear;
    // the shared child (a genuine blood descendant through `son`) stays visible.
    await page.getByLabel("Ẩn dâu/rễ").check();
    await expect(page.getByText(spouse)).toHaveCount(0);
    await expect(page.getByText(stepchild)).toHaveCount(0);
    await expect(page.getByText(stepgrandchild)).toHaveCount(0);
    await expect(page.getByText(son)).toBeVisible();
    await expect(page.getByText(sharedchild)).toBeVisible();

    // Disable it again: hiding is purely visual — everyone reappears, no data lost.
    await page.getByLabel("Ẩn dâu/rễ").uncheck();
    for (const name of [son, spouse, stepchild, stepgrandchild, sharedchild]) {
      await expect(page.getByText(name)).toBeVisible();
    }

    // Cleanup.
    for (const name of [stepgrandchild, stepchild, sharedchild, spouse, son]) {
      await deleteIndividualEverywhere(page, name);
    }
  });
});
