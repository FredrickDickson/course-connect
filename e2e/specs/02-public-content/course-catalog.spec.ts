import { test, expect } from "@playwright/test";
import { CourseCatalogPage } from "../../pom/CourseCatalogPage";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Course catalog (/course-catalog, public)", () => {
  test("lists published courses including the seeded fixture course", async ({ page }) => {
    const catalog = new CourseCatalogPage(page);
    await catalog.goto();
    await expect(catalog.heading).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
  });

  test("search narrows results to matching titles", async ({ page }) => {
    const catalog = new CourseCatalogPage(page);
    await catalog.goto();
    await catalog.search("E2E Seed Course");
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
  });

  test("search with no matches shows the empty state", async ({ page }) => {
    const catalog = new CourseCatalogPage(page);
    await catalog.goto();
    await catalog.search(`nonexistent-course-${Date.now()}`);
    await expect(catalog.noCoursesMessage).toBeVisible();
  });

  test("clicking View Course navigates to the course detail page", async ({ page }) => {
    const catalog = new CourseCatalogPage(page);
    await catalog.goto();
    await catalog.search("E2E Seed Course");
    await catalog.viewCourseButton(0).click();
    await expect(page).toHaveURL(/\/course\/[^/]+$/);
  });
});
