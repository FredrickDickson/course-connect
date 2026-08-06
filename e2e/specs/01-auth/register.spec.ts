import { test, expect } from "@playwright/test";
import { RegisterPage } from "../../pom/RegisterPage";
import { TEST_USERS, TEST_USER_PASSWORD } from "../../fixtures/test-users";

test.describe("Register", () => {
  test("new user can register and is routed to verify-email or onboarding", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    const uniqueEmail = `e2e.new-${Date.now()}@cimalearn.test`;
    await register.fillForm({
      firstName: "New",
      lastName: "User",
      email: uniqueEmail,
      password: "StrongPass123!",
    });
    await register.submit();
    // Depending on whether email confirmation is required for this Supabase
    // project, a fresh signup lands on /verify-email (confirmation required)
    // or /onboarding (auto-confirmed). Either is a valid successful outcome.
    await expect(page).toHaveURL(/\/(verify-email|onboarding)/, { timeout: 15_000 });
  });

  test("mismatched passwords are blocked before submission", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fillForm({
      firstName: "New",
      lastName: "User",
      email: `e2e.mismatch-${Date.now()}@cimalearn.test`,
      password: "StrongPass123!",
      confirmPassword: "DifferentPass123!",
    });
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await register.submit();
    // Should not navigate away — client-side validation blocks it.
    await expect(page).toHaveURL(/\/register/);
  });

  test("weak password is rejected on submit with an inline error", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fillForm({
      firstName: "New",
      lastName: "User",
      email: `e2e.weak-${Date.now()}@cimalearn.test`,
      password: "weak",
      confirmPassword: "weak",
    });
    await register.submit();
    await expect(register.errorAlert).toContainText(/password does not meet security requirements/i);
    await expect(page).toHaveURL(/\/register/);
  });

  test("submitting without agreeing to terms is blocked", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fillForm({
      firstName: "New",
      lastName: "User",
      email: `e2e.noterms-${Date.now()}@cimalearn.test`,
      password: "StrongPass123!",
      agreeToTerms: false,
    });
    await expect(register.submitButton).toBeDisabled();
  });

  test("registering with an already-used email shows an error", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await register.fillForm({
      firstName: "Dup",
      lastName: "User",
      email: TEST_USERS.student.email,
      password: TEST_USER_PASSWORD(),
    });
    await register.submit();
    await expect(register.errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test("sign-in link navigates to /login", async ({ page }) => {
    const register = new RegisterPage(page);
    await register.goto();
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
