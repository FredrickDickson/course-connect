import { test, expect } from "@playwright/test";
import { HomePage } from "../../pom/HomePage";

// "/" now hard-redirects authenticated users straight to /dashboard
// (App.tsx) — the authenticated Home experience lives at /home instead, and
// HomePage.goto() navigates there directly. Runs under the chromium-student
// project (student storageState) — see playwright.config.ts
// testIgnore/testMatch overrides for this file.
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

  test("Browse All Courses navigates to /courses", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.browseCoursesButton.scrollIntoViewIfNeeded();
    await home.browseCoursesButton.click();
    await expect(page).toHaveURL(/\/courses/);
  });
});
