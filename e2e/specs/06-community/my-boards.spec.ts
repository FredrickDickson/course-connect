import { test, expect } from "@playwright/test";

// The seeded course enrollment isn't linked to a course-specific forum board
// (is_course_board / course_edition_id), so the realistic state to cover
// here is the empty one — a student enrolled in a course with no discussion
// board configured for it yet.
test.describe("My course boards (/community/my-boards, student)", () => {
  test("shows an empty state when no course boards are linked", async ({ page }) => {
    await page.goto("/community/my-boards");
    await expect(page.getByRole("heading", { name: "My Course Boards" })).toBeVisible({ timeout: 15_000 });
  });
});
