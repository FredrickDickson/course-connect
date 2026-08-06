import { test, expect } from "@playwright/test";

test.describe("404 (unmatched route)", () => {
  test("shows the not-found page for an unknown route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("error-code")).toHaveText("404");
    await expect(page.getByTestId("button-home")).toBeVisible();
    await expect(page.getByTestId("button-courses")).toBeVisible();
  });

  test("Go Home button navigates to /", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.getByTestId("button-home").click();
    await page.waitForURL("/");
  });
});
