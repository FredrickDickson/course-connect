import { test, expect } from "@playwright/test";
import { CreateCoursePage } from "../../pom/instructor/CreateCoursePage";
import { supabaseAdmin } from "../../fixtures/db";

test.describe("Create course — Professional Programme", () => {
  test("creating a course with level + track redirects to its curriculum builder", async ({ page }) => {
    const create = new CreateCoursePage(page);
    await create.goto();
    await expect(create.heading).toBeVisible();

    const title = `E2E PP Course ${Date.now()}`;
    await create.titleInput.fill(title);
    await create.subtitleInput.fill("E2E subtitle");
    await create.descriptionInput.fill("A course created end-to-end by the Playwright suite.");
    await create.selectCategory("E2E Seed Category");
    // programmeType defaults to Professional Programme, level/track default to associate/ARBITRATION.
    await create.priceInput.fill("100");

    await create.submitButton.click();
    await page.waitForURL(/\/instructor\/courses\/[^/]+\/curriculum/, { timeout: 15_000 });

    // Real insert via the actual create-course flow, not a mock — clean up
    // so repeated runs don't permanently accumulate courses.
    await supabaseAdmin.from("courses").delete().eq("title", title);
  });
});
