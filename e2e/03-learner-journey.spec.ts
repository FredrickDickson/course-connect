import { test, expect, record } from "./fixtures/audit";
import { login } from "./fixtures/users";

test.describe("Learner journey", () => {
  test("dashboard renders enrolled courses", async ({ page }, info) => {
    await record(info, "learner:dashboard", async () => {
      await login(page, "student");
      await page.goto("/dashboard");
      await page.waitForTimeout(1500);
      const cards = page.locator('[data-testid="course-card"], a[href*="/learn/"], a[href*="/video-player"]');
      const n = await cards.count();
      return n > 0
        ? { status: "pass", notes: `${n} course tiles visible` }
        : { status: "partial", notes: "No course tiles — seed user not enrolled?" };
    });
  });

  test("course catalog → detail → enroll button visible", async ({ page }, info) => {
    await record(info, "learner:browse-and-enroll-cta", async () => {
      await login(page, "student");
      await page.goto("/courses");
      await page.waitForTimeout(1500);
      const card = page.locator('[data-testid="course-card"], a[href*="/courses/"]').first();
      if (!(await card.count())) return { status: "broken", notes: "No courses listed" };
      await card.click();
      await page.waitForTimeout(1500);
      const enroll = page.locator('button:has-text("Enroll"), [data-testid="enroll-button"]').first();
      return (await enroll.count())
        ? { status: "pass", notes: "Enroll CTA visible" }
        : { status: "partial", notes: "No enroll CTA on detail page" };
    });
  });
});