import { test, expect } from "@playwright/test";

test.describe("Community notifications (/community/notifications, student)", () => {
  test("loads without crashing (no seeded notifications)", async ({ page }) => {
    const response = await page.goto("/community/notifications");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: /notifications/i }).first()).toBeVisible();
  });
});
