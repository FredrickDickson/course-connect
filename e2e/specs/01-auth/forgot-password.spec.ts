import { test, expect } from "@playwright/test";
import { ForgotPasswordPage } from "../../pom/ForgotPasswordPage";
import { TEST_USERS } from "../../fixtures/test-users";

test.describe("Forgot password", () => {
  test("known email shows the generic success message", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestReset(TEST_USERS.student.email);
    await expect(forgotPassword.successAlert).toBeVisible();
  });

  test("unknown email shows the same generic success message (no user enumeration)", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestReset(`no-such-user-${Date.now()}@cimalearn.test`);
    await expect(forgotPassword.successAlert).toBeVisible();
  });

  test("resend is rate-limited for 10 seconds immediately after a request", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.requestReset(TEST_USERS.student.email);
    const rateLimitedButton = page.getByRole("button", { name: /try again in \d+s/i });
    await expect(rateLimitedButton).toBeVisible();
    await expect(rateLimitedButton).toBeDisabled();
  });

  test("back-to-sign-in link navigates to /login", async ({ page }) => {
    const forgotPassword = new ForgotPasswordPage(page);
    await forgotPassword.goto();
    await forgotPassword.backToSignInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
