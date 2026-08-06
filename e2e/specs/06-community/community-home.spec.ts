import { test, expect } from "@playwright/test";
import { CommunityHomePage } from "../../pom/community/CommunityHomePage";

test.describe("Community home (/community, student)", () => {
  test("shows the seeded forum category", async ({ page }) => {
    const community = new CommunityHomePage(page);
    await community.goto();
    await expect(community.heading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E Seed Forum Category")).toBeVisible({ timeout: 15_000 });
  });

  test("sub-navigation links go to the right pages", async ({ page }) => {
    const community = new CommunityHomePage(page);
    await community.goto();
    await community.myPostsLink.click();
    await expect(page).toHaveURL(/\/community\/my-posts/);
  });

  test("clicking the seeded category navigates to its forum page", async ({ page }) => {
    const community = new CommunityHomePage(page);
    await community.goto();
    await page.getByText("E2E Seed Forum Category").waitFor({ timeout: 15_000 });
    await page.getByText("E2E Seed Forum Category").click();
    await expect(page).toHaveURL(/\/community\/forums\/e2e-seed-forum-category/);
  });
});
