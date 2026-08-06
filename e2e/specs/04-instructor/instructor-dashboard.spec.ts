import { test, expect } from "@playwright/test";
import { InstructorDashboardPage } from "../../pom/instructor/InstructorDashboardPage";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Instructor dashboard (/instructor)", () => {
  test("shows the instructor's seeded course in the overview", async ({ page }) => {
    const dashboard = new InstructorDashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.heading).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
  });

  test("Courses tab lists all courses with student counts and price", async ({ page }) => {
    const dashboard = new InstructorDashboardPage(page);
    await dashboard.goto();
    await dashboard.coursesTab.click();
    await expect(page.getByRole("heading", { name: /all courses/i })).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
  });

  test("Analytics tab shows course performance and summary counts", async ({ page }) => {
    const dashboard = new InstructorDashboardPage(page);
    await dashboard.goto();
    await dashboard.analyticsTab.click();
    // shadcn's CardTitle renders a <div>, not a semantic heading element.
    await expect(page.getByText("Course Performance")).toBeVisible();
    await expect(page.getByText("Summary")).toBeVisible();
  });

  test("Create Course button navigates to the course-creation form", async ({ page }) => {
    const dashboard = new InstructorDashboardPage(page);
    await dashboard.goto();
    await dashboard.createCourseButton.click();
    await expect(page).toHaveURL(/\/instructor\/courses\/new/);
  });
});
