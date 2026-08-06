import { test, expect } from "@playwright/test";
import { CommunityForumCategoryPage } from "../../pom/community/CommunityForumCategoryPage";
import { E2E_SEED_FORUM_POST_TITLE } from "../../fixtures/test-users";

test.describe("Forum category (/community/forums/:slug, student)", () => {
  test("shows the category name and the seeded post", async ({ page }) => {
    const category = new CommunityForumCategoryPage(page);
    await category.goto("e2e-seed-forum-category");
    await expect(page.getByRole("heading", { name: "E2E Seed Forum Category" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(E2E_SEED_FORUM_POST_TITLE)).toBeVisible({ timeout: 15_000 });
  });

  test("unknown category slug shows a not-found state", async ({ page }) => {
    const category = new CommunityForumCategoryPage(page);
    await category.goto("no-such-category");
    await expect(page.getByRole("heading", { name: "Category not found" })).toBeVisible({ timeout: 15_000 });
  });
});
