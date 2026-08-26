import { test, expect } from "@playwright/test";
import { LoginPage } from "../../pom/LoginPage";
import { TEST_USERS, TEST_USER_PASSWORD } from "../../fixtures/test-users";

test.describe("Login", () => {
  test("student logs in and lands on /sessions", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(TEST_USERS.student.email, TEST_USER_PASSWORD());
    await expect(page).toHaveURL(/\/sessions/);
  });

  test("instructor logs in and lands on the instructor dashboard", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(TEST_USERS.instructor.email, TEST_USER_PASSWORD());
    await expect(page).toHaveURL(/\/instructor/);
  });

  test("admin logs in and lands on the admin dashboard regardless of any pending redirect", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWaitForRedirect(TEST_USERS.admin.email, TEST_USER_PASSWORD());
    await expect(page).toHaveURL(/\/admin/);
  });

  test("wrong password shows an inline error and stays on /login", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(TEST_USERS.student.email, "definitely-the-wrong-password");
    await expect(login.errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unregistered email shows an inline error and stays on /login", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(`no-such-user-${Date.now()}@cimalearn.test`, "SomePassword123!");
    await expect(login.errorAlert).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("honors a pending redirect after a non-admin logs in", async ({ page }) => {
    // checkout.tsx (unauthenticated) stores the intended destination in
    // sessionStorage before bouncing to /login; login.tsx reads and clears it.
    await page.goto("/login");
    await page.evaluate(() => sessionStorage.setItem("redirectAfterLogin", "/profile"));
    const login = new LoginPage(page);
    await login.loginAndWaitForRedirect(TEST_USERS.student.email, TEST_USER_PASSWORD());
    await expect(page).toHaveURL(/\/profile/);
  });

  test("admin login ignores any pending redirect and always lands on /admin", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => sessionStorage.setItem("redirectAfterLogin", "/profile"));
    const login = new LoginPage(page);
    await login.loginAndWaitForRedirect(TEST_USERS.admin.email, TEST_USER_PASSWORD());
    await expect(page).toHaveURL(/\/admin/);
  });

  test("forgot-password link navigates to /forgot-password", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("get-started link navigates to /register", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });
});
