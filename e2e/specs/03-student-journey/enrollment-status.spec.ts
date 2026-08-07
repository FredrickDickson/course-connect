import { test, expect } from "@playwright/test";
import { getSeededCourseId } from "../../fixtures/seeded-course";

test.describe("Enrollment status (/enroll/:courseId/status, student)", () => {
  test("renders eligibility guidance without crashing for a real course", async ({ page }) => {
    const courseId = await getSeededCourseId();
    await page.goto(`/enroll/${courseId}/status`);
    // Either the eligibility guidance renders, or a retry-capable error card
    // does (e.g. if check-eligibility 4xxs for this user/course combo) — both
    // are valid non-crash outcomes; a blank/broken page is not.
    await expect(
      page.getByRole("heading", { name: /your path to/i }).or(page.getByRole("button", { name: /retry/i })),
    ).toBeVisible({ timeout: 15_000 });
  });
});
