import { test, expect } from "@playwright/test";

// /admin-setup is itself gated behind requiredRole="admin" (App.tsx) — only
// reachable by an already-authenticated admin, which means the "bootstrap
// the first admin" signup path can't actually be exercised through the app's
// own routing (a real chicken-and-egg gap, not something to fix here). Since
// our seeded admin already exists, this covers the realistic reachable
// state: signup disabled with an explanatory message, login tab usable.
test.describe("Admin setup (/admin-setup, admin)", () => {
  test("shows the admin-already-exists state on the Setup tab", async ({ page }) => {
    await page.goto("/admin-setup");
    await page.getByRole("tab", { name: /setup/i }).click();
    await expect(page.getByText("An admin account already exists.")).toBeVisible();
    await expect(page.getByTestId("button-setup-admin")).toBeDisabled();
  });

  test("Sign In tab is the default view", async ({ page }) => {
    await page.goto("/admin-setup");
    await expect(page.getByRole("tab", { name: /sign in/i })).toHaveAttribute("data-state", "active");
    await expect(page.getByLabel("Admin Email")).toBeVisible();
  });
});
