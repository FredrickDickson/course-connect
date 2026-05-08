import { test, expect, record } from "./fixtures/audit";
import { TEST_USERS, login } from "./fixtures/users";

test.describe("Auth", () => {
  test("register form validates", async ({ page }, info) => {
    await record(info, "auth:register-validation", async () => {
      await page.goto("/register");
      await page.click('button[type="submit"]').catch(() => null);
      await page.waitForTimeout(500);
      const text = await page.locator("body").innerText();
      if (/required|invalid|enter/i.test(text)) return { status: "pass", notes: "Validation messages shown" };
      return { status: "partial", notes: "No validation messages observed" };
    });
  });

  test("student login works", async ({ page }, info) => {
    await record(info, "auth:student-login", async () => {
      await login(page, "student");
      const url = page.url();
      if (/dashboard|home|onboarding/.test(url)) return { status: "pass", notes: `Landed on ${url}` };
      return { status: "broken", notes: `Stuck at ${url}` };
    });
  });

  test("logout returns to landing", async ({ page }, info) => {
    await record(info, "auth:logout", async () => {
      await login(page, "student");
      const logout = page.locator('[data-testid="logout-button"], button:has-text("Sign out"), button:has-text("Log out")').first();
      if (!(await logout.count())) return { status: "partial", notes: "No logout control found" };
      await logout.click();
      await page.waitForTimeout(1000);
      return { status: /\/(login|$)/.test(page.url()) ? "pass" : "partial", notes: page.url() };
    });
  });

  test("student is blocked from /admin", async ({ page }, info) => {
    await record(info, "auth:role-guard-admin", async () => {
      await login(page, "student");
      await page.goto("/admin");
      await page.waitForTimeout(1500);
      if (/\/admin/.test(page.url())) return { status: "broken", notes: "Student reached /admin" };
      return { status: "pass", notes: `Redirected to ${page.url()}` };
    });
  });
});