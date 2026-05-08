import { test, expect, record } from "./fixtures/audit";
import { login } from "./fixtures/users";

test.describe("Learning experience", () => {
  test("video player tabs: Activities hidden, Resources visible", async ({ page }, info) => {
    await record(info, "learn:tabs-config", async () => {
      await login(page, "student");
      await page.goto("/dashboard");
      const lessonLink = page.locator('a[href*="/video-player"], a[href*="/learn/"]').first();
      if (!(await lessonLink.count())) return { status: "not_built", notes: "No enrolled lesson to open" };
      await lessonLink.click();
      await page.waitForTimeout(2000);
      const tabsText = await page.locator('[role="tablist"], nav').first().innerText().catch(() => "");
      const hasActivities = /activities/i.test(tabsText);
      const hasResources = /resources|sources/i.test(tabsText);
      if (hasActivities) return { status: "broken", notes: "Activities tab still visible" };
      if (!hasResources) return { status: "partial", notes: "Resources tab missing" };
      return { status: "pass", notes: "Activities hidden, Resources present" };
    });
  });

  test("sidebar shows lesson checkboxes", async ({ page }, info) => {
    await record(info, "learn:sidebar-checkboxes", async () => {
      await login(page, "student");
      await page.goto("/dashboard");
      const lesson = page.locator('a[href*="/video-player"], a[href*="/learn/"]').first();
      if (!(await lesson.count())) return { status: "not_built", notes: "No lesson available" };
      await lesson.click();
      await page.waitForTimeout(1500);
      const checks = page.locator('input[type="checkbox"], [role="checkbox"]');
      const n = await checks.count();
      return n > 0
        ? { status: "pass", notes: `${n} checkboxes` }
        : { status: "broken", notes: "No checkboxes rendered" };
    });
  });
});