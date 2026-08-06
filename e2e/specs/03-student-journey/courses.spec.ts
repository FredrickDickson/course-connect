import { test, expect } from "@playwright/test";
import { CoursesPage } from "../../pom/CoursesPage";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Courses (/courses, protected)", () => {
  test("defaults to the Professional Programme tab and lists the seed course", async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await expect(courses.professionalProgrammeTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
    await expect(courses.resultsCount).toContainText("course");
  });

  test("search narrows to matching titles and updates the results count", async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await courses.searchInput.fill("E2E Seed Course");
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
    await expect(courses.resultsCount).toContainText("1 course");
  });

  test("search with no matches shows the empty state", async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await courses.searchInput.fill(`nonexistent-${Date.now()}`);
    await expect(courses.emptyState).toBeVisible();
  });

  test("switching to Adjunct Courses tab hides the level filter", async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await courses.adjunctCoursesTab.click();
    await expect(courses.adjunctCoursesTab).toHaveAttribute("data-state", "active");
    await expect(courses.levelSelect).not.toBeVisible();
  });

  test("list view toggle switches the layout", async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await courses.listViewButton.click();
    await expect(page.getByRole("link", { name: /view course/i }).first()).toBeVisible();
  });
});
