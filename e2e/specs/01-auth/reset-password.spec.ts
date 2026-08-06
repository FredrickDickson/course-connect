import { test, expect } from "@playwright/test";
import { ResetPasswordPage } from "../../pom/ResetPasswordPage";

test.describe("Reset password", () => {
  // Reaching this page normally requires clicking a real Supabase recovery
  // email link (which sets a session). Without that, the page's own session
  // check surfaces an "invalid or expired" error — that path is what's
  // testable without driving a real inbox, and it's a real user-facing state
  // (an expired/reused link) worth covering.
  test("without a recovery session, shows an invalid/expired link error", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto();
    await expect(resetPassword.invalidLinkError).toBeVisible();
  });

  test("password requirement checklist updates as the user types", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto();
    await resetPassword.passwordInput.fill("weak");
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page.getByText(/one uppercase letter/i)).toBeVisible();

    await resetPassword.passwordInput.fill("StrongPass123!");
    await resetPassword.confirmPasswordInput.fill("StrongPass123!");
    await expect(page.getByText(/passwords match/i)).toBeVisible();
  });

  test("mismatched confirmation shows an inline warning", async ({ page }) => {
    const resetPassword = new ResetPasswordPage(page);
    await resetPassword.goto();
    await resetPassword.passwordInput.fill("StrongPass123!");
    await resetPassword.confirmPasswordInput.fill("Different123!");
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(resetPassword.submitButton).toBeDisabled();
  });
});
