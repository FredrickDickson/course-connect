import { test, expect } from "@playwright/test";
import { supabaseAdmin } from "../../fixtures/db";
import { TEST_USERS, TEST_USER_PASSWORD } from "../../fixtures/test-users";
import { LoginPage } from "../../pom/LoginPage";
import { OnboardingPage } from "../../pom/OnboardingPage";

/**
 * Onboarding must NOT reuse the shared pre-completed fixtures (student/
 * instructor/admin) — those already have profile_completed: true, which
 * would skip the very flow under test. Each test here creates its own
 * fresh, never-onboarded user via the Admin API.
 */
async function createFreshUser() {
  const email = `e2e.onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cimalearn.test`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_USER_PASSWORD(),
    email_confirm: true,
    user_metadata: { first_name: "Fresh", last_name: "Onboarder", role: "student" },
  });
  if (error) throw error;
  return { email, id: data.user.id };
}

test.describe("Onboarding", () => {
  test("registering and logging in with no profile routes straight to onboarding step 1", async ({ page }) => {
    const { email } = await createFreshUser();
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(email, TEST_USER_PASSWORD());
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText("Personal Information")).toBeVisible();
  });

  test("choosing 'No' ADR experience grants instant Associate access and lands on the catalog", async ({ page }) => {
    const { email } = await createFreshUser();
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(email, TEST_USER_PASSWORD());

    const onboarding = new OnboardingPage(page);
    await onboarding.fillStep1();
    await onboarding.submitStep1();

    await expect(onboarding.experienceGateHeading).toBeVisible({ timeout: 10_000 });
    await onboarding.noExperienceButton.click();
    await page.waitForURL(/\/course-catalog/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/course-catalog/);
  });

  test("choosing 'Yes' ADR experience routes to the expedited application", async ({ page }) => {
    const { email } = await createFreshUser();
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(email, TEST_USER_PASSWORD());

    const onboarding = new OnboardingPage(page);
    await onboarding.fillStep1();
    await onboarding.submitStep1();

    await expect(onboarding.experienceGateHeading).toBeVisible({ timeout: 10_000 });
    await onboarding.yesExperienceButton.click();
    await page.waitForURL(/\/expedited-application/, { timeout: 10_000 });
    await expect(page.getByText("Qualification Track")).toBeVisible();
  });

  test("a logged-in user who already completed onboarding does not land back on it", async ({ page }) => {
    // Re-use the shared, already-onboarded student fixture as a negative check.
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(TEST_USERS.student.email, TEST_USER_PASSWORD());
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
