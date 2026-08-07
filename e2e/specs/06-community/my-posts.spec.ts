import { test, expect } from "@playwright/test";
import { CommunityMyPostsPage } from "../../pom/community/CommunityMyPostsPage";
import { E2E_SEED_FORUM_POST_TITLE } from "../../fixtures/test-users";

test.describe("My posts (/community/my-posts, student)", () => {
  test("lists the seeded post authored by this student", async ({ page }) => {
    const myPosts = new CommunityMyPostsPage(page);
    await myPosts.goto();
    await expect(page.getByText(E2E_SEED_FORUM_POST_TITLE)).toBeVisible({ timeout: 15_000 });
  });
});
