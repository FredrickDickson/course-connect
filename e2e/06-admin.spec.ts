import { test, expect, record } from "./fixtures/audit";
import { login } from "./fixtures/users";

test.describe("Admin", () => {
  test("admin dashboard renders stats", async ({ page }, info) => {
    await record(info, "admin:dashboard", async () => {
      await login(page, "admin");
      await page.goto("/admin");
      await page.waitForTimeout(2000);
      const stats = page.locator('[data-testid="stat-card"], [class*="stat" i]');
      const n = await stats.count();
      return n > 0 ? { status: "pass", notes: `${n} stat cards` } : { status: "partial", notes: "No stat cards detected" };
    });
  });

  test("expedited applications page reachable", async ({ page }, info) => {
    await record(info, "admin:expedited", async () => {
      await login(page, "admin");
      const r = await page.goto("/admin/expedited-applications");
      if (!r || !r.ok()) return { status: "broken", notes: `HTTP ${r?.status()}` };
      return { status: "pass" };
    });
  });
});