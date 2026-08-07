import { test, expect } from "@playwright/test";
import { VerifyEmailPage } from "../../pom/VerifyEmailPage";

test.describe("Verify email", () => {
  test("shows the check-your-email heading and the emailed address", async ({ page }) => {
    const verifyEmail = new VerifyEmailPage(page);
    await verifyEmail.goto("someone@cimalearn.test");
    await expect(verifyEmail.heading).toBeVisible();
    await expect(page.getByText("someone@cimalearn.test")).toBeVisible();
  });

  test("falls back to a generic placeholder when no email query param is present", async ({ page }) => {
    const verifyEmail = new VerifyEmailPage(page);
    await verifyEmail.goto();
    await expect(page.getByText("your inbox")).toBeVisible();
  });

  test("resend button flips to a confirmed state after clicking", async ({ page }) => {
    const verifyEmail = new VerifyEmailPage(page);
    await verifyEmail.goto("someone@cimalearn.test");
    await verifyEmail.resendButton.click();
    await expect(verifyEmail.resentConfirmation).toBeVisible({ timeout: 10_000 });
    await expect(verifyEmail.resentConfirmation).toBeDisabled();
  });

  test("back-to-sign-in link navigates to /login", async ({ page }) => {
    const verifyEmail = new VerifyEmailPage(page);
    await verifyEmail.goto();
    await verifyEmail.backToSignInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
