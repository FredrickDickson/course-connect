import { test, expect } from "@playwright/test";
import { CreateCoursePage } from "../../pom/instructor/CreateCoursePage";
import { supabaseAdmin } from "../../fixtures/db";

test.describe("Create course — Adjunct Course", () => {
  test("switching to Adjunct Course hides level/track and still creates successfully", async ({ page }) => {
    const create = new CreateCoursePage(page);
    await create.goto();

    const title = `E2E Adjunct Course ${Date.now()}`;
    await create.titleInput.fill(title);
    await create.subtitleInput.fill("E2E adjunct subtitle");
    await create.descriptionInput.fill("A standalone adjunct course created end-to-end by Playwright.");
    await create.selectCategory("E2E Seed Category");
    await create.selectByLabel("Course Type *", "Adjunct Course (standalone, no prerequisites)");

    await expect(page.getByLabel("Difficulty Level *")).not.toBeVisible();
    await expect(page.getByLabel("Qualification Track *")).not.toBeVisible();

    await create.priceInput.fill("50");
    await create.submitButton.click();
    await page.waitForURL(/\/instructor\/courses\/[^/]+\/curriculum/, { timeout: 15_000 });

    // Real insert via the actual create-course flow, not a mock — clean up
    // so repeated runs don't permanently accumulate courses.
    await supabaseAdmin.from("courses").delete().eq("title", title);
  });
});
