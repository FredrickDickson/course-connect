import { test, expect } from "@playwright/test";
import { HomePage } from "../../pom/HomePage";

// Authenticated "/" renders Home (App.tsx conditional), not Landing. Runs
// under the chromium-student project (student storageState) — see
// playwright.config.ts testIgnore/testMatch overrides for this file.
test.describe("Home (authenticated /)", () => {
  test("shows a personalized welcome and progress stats", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(home.statEnrolledCourses).toBeVisible();
    await expect(home.statCompletedCourses).toBeVisible();
    await expect(home.statStudyHours).toBeVisible();
  });

  test("Explore Programs navigates to /course-catalog", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.explorePropramsButton.scrollIntoViewIfNeeded();
    await home.explorePropramsButton.click();
    await expect(page).toHaveURL(/\/course-catalog/);
  });

  test("Join Community navigates to /community", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.joinCommunityButton.scrollIntoViewIfNeeded();
    await home.joinCommunityButton.click();
    await expect(page).toHaveURL(/\/community/);
  });

  test("Browse All Courses navigates to /courses", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.browseCoursesButton.scrollIntoViewIfNeeded();
    await home.browseCoursesButton.click();
    await expect(page).toHaveURL(/\/courses/);
  });
});
