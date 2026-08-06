import { test, expect } from "@playwright/test";
import { CommunityCreatePostPage } from "../../pom/community/CommunityCreatePostPage";
import { supabaseAdmin } from "../../fixtures/db";

test.describe("Create post (/community/forums/:slug/new, student)", () => {
  test("creating a topic redirects to the new post's page", async ({ page }) => {
    const create = new CommunityCreatePostPage(page);
    await create.goto("e2e-seed-forum-category");
    await expect(create.heading).toBeVisible({ timeout: 15_000 });

    const title = `E2E Created Post ${Date.now()}`;
    await create.selectBoard("E2E Seed Forum Board");
    await create.titleInput.fill(title);
    await create.fillBody("This post was created end-to-end by the Playwright suite.");
    await create.submitButton.click();

    await page.waitForURL(/\/community\/posts\/.+/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });

    // Real insert via the actual create-post flow, not a mock — clean up so
    // repeated runs don't permanently accumulate posts.
    await supabaseAdmin.from("forum_posts").delete().eq("title", title);
  });
});
