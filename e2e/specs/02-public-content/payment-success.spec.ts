import { test, expect } from "@playwright/test";

// Real Paystack payment verification is out of scope (per project decision).
// These cover the two states reachable without a real payment: no reference
// in the URL, and an unauthenticated visit with a reference present (the
// verify-payment mutation never fires without a session, so it renders the
// same "couldn't verify" state as a genuine failure).
test.describe("Payment success page (/payment-success)", () => {
  test("no reference in the URL shows an invalid-reference state", async ({ page }) => {
    await page.goto("/payment-success");
    await expect(page.getByRole("heading", { name: "Invalid Payment Reference" })).toBeVisible();
  });

  test("a reference present but unauthenticated shows a verification-failed state", async ({ page }) => {
    await page.goto("/payment-success?reference=e2e-test-reference-not-real");
    await expect(page.getByRole("heading", { name: "Payment Verification Failed" })).toBeVisible();
  });

  test("is reachable without authentication (public route, per App.tsx line 154/197)", async ({ page }) => {
    const response = await page.goto("/payment-success");
    expect(response?.ok()).toBeTruthy();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
