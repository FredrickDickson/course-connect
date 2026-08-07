import { test, expect } from "@playwright/test";

// programs.tsx is almost entirely static marketing content (hardcoded
// program cards, no backend queries) — coverage here confirms the tabs and
// static CTAs render and navigate correctly, not business logic.
test.describe("Programs (/programs, protected)", () => {
  test("renders the hero and program tabs", async ({ page }) => {
    await page.goto("/programs");
    await expect(page.getByTestId("programs-title")).toBeVisible();
    await expect(page.getByTestId("program-tabs")).toBeVisible();
    await expect(page.getByTestId("program-ma")).toBeVisible();
    await expect(page.getByTestId("program-fellowship")).toBeVisible();
  });

  test("switching to the Specialized Courses tab shows its content", async ({ page }) => {
    await page.goto("/programs");
    await page.getByRole("tab", { name: "Specialized Courses" }).click();
    await expect(page.getByTestId("tab-specialized")).toBeVisible();
    await expect(page.getByTestId("course-mediation")).toBeVisible();
  });

  test("switching to the Certification Paths tab shows its content", async ({ page }) => {
    await page.goto("/programs");
    await page.getByRole("tab", { name: "Certification Paths" }).click();
    await expect(page.getByTestId("tab-certification")).toBeVisible();
    await expect(page.getByTestId("path-professional")).toBeVisible();
  });

  test("Learn More on the Global M&A program links to /courses", async ({ page }) => {
    await page.goto("/programs");
    await page.getByTestId("button-enroll-ma").click();
    await expect(page).toHaveURL(/\/courses/);
  });
});
