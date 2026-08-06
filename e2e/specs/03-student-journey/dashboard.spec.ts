import { test, expect } from "@playwright/test";
import { DashboardPage } from "../../pom/DashboardPage";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Dashboard (/dashboard, student)", () => {
  test("shows a personalized welcome and the enrolled seed course", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    // Dashboard now gates its first paint behind a combined multi-query
    // fetch (favorites + completions + enrollments + qualification state) —
    // slower than the old independent queries, so give it more room.
    await expect(dashboard.welcomeHeading).toBeVisible({ timeout: 15_000 });
    await expect(dashboard.myCoursesHeading).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible({ timeout: 15_000 });
  });

  test("browse courses link navigates to /course-catalog", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.browseCoursesLink.click();
    await expect(page).toHaveURL(/\/course-catalog/);
  });
});
