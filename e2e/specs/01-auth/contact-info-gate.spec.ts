import { test, expect, type Page } from "@playwright/test";
import { supabaseAdmin } from "../../fixtures/db";
import { TEST_USER_PASSWORD } from "../../fixtures/test-users";
import { getSeededCourseId } from "../../fixtures/seeded-course";
import { LoginPage } from "../../pom/LoginPage";
import { OnboardingPage } from "../../pom/OnboardingPage";

/**
 * Phone / WhatsApp must be captured before a student can use the app.
 * Regression: users could leave /onboarding (e.g. straight to checkout), pay,
 * and never have a phone number stored.
 */
const createdUserIds: string[] = [];

async function createFreshUser() {
  const email = `e2e.contact-gate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@cimalearn.test`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_USER_PASSWORD(),
    email_confirm: true,
    user_metadata: { first_name: "Contact", last_name: "Gate", role: "student" },
  });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  return { email, id: data.user.id };
}

async function loginAs(page: Page, email: string) {
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWaitForRedirect(email, TEST_USER_PASSWORD());
}

async function getStoredContact(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("phone, whatsapp")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

test.afterAll(async () => {
  for (const id of createdUserIds) {
    await supabaseAdmin.from("activity_log").delete().eq("user_id", id);
    await supabaseAdmin.from("profiles").delete().eq("user_id", id);
    await supabaseAdmin.from("users").delete().eq("id", id);
    await supabaseAdmin.auth.admin.deleteUser(id);
  }
});

test.describe("Contact-info gate", () => {
  test("a student with no phone cannot skip onboarding by navigating away", async ({ page }) => {
    const { email } = await createFreshUser();
    await loginAs(page, email);
    await expect(page).toHaveURL(/\/onboarding/);

    for (const route of ["/dashboard", "/sessions", "/courses"]) {
      await page.goto(route);
      await page.waitForURL(/\/onboarding/, { timeout: 10_000 });
    }
  });

  test("deep-linking to checkout collects phone first, stores it, then returns to checkout", async ({ page }) => {
    const { email, id } = await createFreshUser();
    const courseId = await getSeededCourseId();
    await loginAs(page, email);

    await page.goto(`/checkout/${courseId}`);
    await page.waitForURL(/\/onboarding/, { timeout: 10_000 });
    expect(await getStoredContact(id)).toBeNull();

    const onboarding = new OnboardingPage(page);
    await onboarding.fillStep1({ phone: "0244123456" });
    await onboarding.submitStep1();
    await expect(onboarding.experienceGateHeading).toBeVisible({ timeout: 10_000 });

    // WhatsApp left blank → defaults to the phone number.
    const stored = await getStoredContact(id);
    expect(stored?.phone).toBe("+233244123456");
    expect(stored?.whatsapp).toBe("+233244123456");

    await onboarding.noExperienceButton.click();
    await page.waitForURL(new RegExp(`/checkout/${courseId}`), { timeout: 10_000 });
  });

  test("a separate WhatsApp number is stored as entered", async ({ page }) => {
    const { email, id } = await createFreshUser();
    await loginAs(page, email);

    const onboarding = new OnboardingPage(page);
    await onboarding.fillStep1({ phone: "0244123456" });
    await page.locator("#whatsapp").fill("0501234567");
    await onboarding.submitStep1();
    await expect(onboarding.experienceGateHeading).toBeVisible({ timeout: 10_000 });

    const stored = await getStoredContact(id);
    expect(stored?.phone).toBe("+233244123456");
    expect(stored?.whatsapp).toBe("+233501234567");
  });

  test("step 1 refuses to save without a phone number", async ({ page }) => {
    const { email, id } = await createFreshUser();
    await loginAs(page, email);

    const onboarding = new OnboardingPage(page);
    await onboarding.fillStep1();
    await onboarding.phoneInput.fill("");
    await onboarding.submitStep1();

    await expect(page.getByText("Phone Number is required")).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding/);
    expect(await getStoredContact(id)).toBeNull();
  });

  test("an existing 'completed' profile with no phone is still sent to onboarding", async ({ page }) => {
    const { email, id } = await createFreshUser();
    const { error } = await supabaseAdmin.from("profiles").insert({
      user_id: id,
      full_name: "Contact Gate",
      profile_completed: true,
      country: "Ghana",
    });
    if (error) throw error;

    await loginAs(page, email);
    await page.goto("/dashboard");
    await page.waitForURL(/\/onboarding/, { timeout: 10_000 });
  });

  test("/profile stays reachable without a phone so it can be added there", async ({ page }) => {
    const { email } = await createFreshUser();
    await loginAs(page, email);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
  });
});
