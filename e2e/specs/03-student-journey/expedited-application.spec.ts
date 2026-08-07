import { test, expect } from "@playwright/test";

// Full multi-step form submission (track/level selection, document upload)
// is covered indirectly by 01-auth/onboarding.spec.ts's "Yes" branch, which
// verifies landing here from onboarding. This covers direct access as an
// already-logged-in student with no existing professional profile.
test.describe("Expedited application (/expedited-application, student)", () => {
  test("shows the qualification track selection for a student with no existing application", async ({ page }) => {
    await page.goto("/expedited-application");
    await expect(page.getByText("Qualification Track")).toBeVisible();
    await expect(page.getByText("Target Qualification Level")).toBeVisible();
  });
});
