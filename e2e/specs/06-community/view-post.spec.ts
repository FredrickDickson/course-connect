import { test, expect } from "@playwright/test";
import { CommunityPostPage } from "../../pom/community/CommunityPostPage";
import { E2E_SEED_FORUM_POST_SLUG, E2E_SEED_FORUM_POST_TITLE } from "../../fixtures/test-users";

test.describe("View post (/community/posts/:slug, student)", () => {
  test("shows the seeded post's title and body", async ({ page }) => {
    const post = new CommunityPostPage(page);
    await post.goto(E2E_SEED_FORUM_POST_SLUG);
    await expect(page.getByRole("heading", { name: E2E_SEED_FORUM_POST_TITLE })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Seeded forum post body for the E2E test suite.")).toBeVisible({ timeout: 15_000 });
  });

  test("unknown post slug shows a not-found state", async ({ page }) => {
    const post = new CommunityPostPage(page);
    await post.goto("no-such-post-slug");
    await expect(page.getByRole("heading", { name: "Post not found" })).toBeVisible({ timeout: 15_000 });
  });
});
