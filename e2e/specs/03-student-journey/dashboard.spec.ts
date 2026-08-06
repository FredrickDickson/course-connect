import { test, expect } from "@playwright/test";
import { DashboardPage } from "../../pom/DashboardPage";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Dashboard (/dashboard, student)", () => {
  test("shows a personalized welcome and the enrolled seed course", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.welcomeHeading).toBeVisible();
    await expect(dashboard.myCoursesHeading).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
  });

  test("browse courses link navigates to /course-catalog", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.browseCoursesLink.click();
    await expect(page).toHaveURL(/\/course-catalog/);
  });
});
