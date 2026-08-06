import { test, expect } from "@playwright/test";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

test.describe("Profile (/profile, student)", () => {
  test("shows the user's name, tabs, and enrollment count", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Erin Student" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /information/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /my courses \(1\)/i })).toBeVisible();
  });

  test("courses tab lists the seeded enrollment", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("tab", { name: /my courses/i }).click();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
  });

  test("editing personal info saves and reflects the new value", async ({ page }) => {
    await page.goto("/profile");
    // Visible text is just "Edit"/"Save", but an explicit aria-label
    // ("Edit/Save basic information") overrides the accessible name.
    await page.getByRole("button", { name: "Edit basic information" }).click();
    const bioField = page.getByPlaceholder("Tell us about yourself...");
    const bio = `E2E bio ${Date.now()}`;
    await bioField.fill(bio);
    await page.getByRole("button", { name: "Save basic information" }).click();
    await expect(page.getByText("Personal info updated", { exact: true })).toBeVisible();
    await expect(page.getByText(bio)).toBeVisible();
  });
});
