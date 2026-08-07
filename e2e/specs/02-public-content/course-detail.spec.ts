import { test, expect } from "@playwright/test";
import { CourseDetailPage } from "../../pom/CourseDetailPage";
import { getSeededCourseId } from "../../fixtures/seeded-course";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Course detail (/course/:id, public)", () => {
  test("renders course title, subtitle, and description", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const detail = new CourseDetailPage(page);
    await detail.goto(courseId);
    await expect(detail.title).toHaveText(E2E_SEED_COURSE_TITLE);
    await expect(detail.subtitle).toBeVisible();
    await expect(detail.description).toBeVisible();
  });

  test("curriculum tab lists the seeded module and lessons", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const detail = new CourseDetailPage(page);
    await detail.goto(courseId);
    await detail.curriculumTab.click();
    await expect(page.getByText("Module 1: Introduction")).toBeVisible();
    await expect(page.getByText("Lesson 1: Getting Started")).toBeVisible();
  });

  test("unknown course id shows a not-found state", async ({ page }) => {
    const detail = new CourseDetailPage(page);
    await detail.goto("00000000-0000-0000-0000-000000000000");
    // React Query's default retry policy (client/src/lib/queryClient.ts)
    // retries any non-4xx-formatted error up to 3x with exponential backoff
    // before settling — a Supabase .single() "no rows" PostgrestError doesn't
    // match its "N: message" 4xx-detection regex, so it retries ~7s worth
    // before the not-found branch renders.
    await expect(detail.courseNotFoundHeading).toBeVisible({ timeout: 15_000 });
  });

  test("unauthenticated Enroll Now redirects to login with a return path", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const detail = new CourseDetailPage(page);
    await detail.goto(courseId);
    await detail.enrollNowButton.click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain(`redirect=/course/${courseId}`);
  });
});
