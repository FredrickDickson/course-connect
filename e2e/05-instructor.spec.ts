import { test, expect, record } from "./fixtures/audit";
import { login } from "./fixtures/users";

test.describe("Instructor flows", () => {
  test("instructor dashboard loads", async ({ page }, info) => {
    await record(info, "instructor:dashboard", async () => {
      await login(page, "instructor");
      await page.goto("/instructor");
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (/access denied|forbidden/i.test(text)) return { status: "broken", notes: "Instructor blocked from /instructor" };
      return /course|lesson|module/i.test(text) ? { status: "pass" } : { status: "partial" };
    });
  });

  test("create-course form is reachable", async ({ page }, info) => {
    await record(info, "instructor:create-course", async () => {
      await login(page, "instructor");
      await page.goto("/create-course");
      await page.waitForTimeout(1500);
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
      return (await titleInput.count()) ? { status: "pass" } : { status: "broken", notes: "Form not rendered" };
    });
  });

  test("resource upload UI exists for instructor", async ({ page }, info) => {
    await record(info, "instructor:resource-upload-ui", async () => {
      await login(page, "instructor");
      await page.goto("/resources");
      await page.waitForTimeout(1000);
      const dropzone = page.locator('input[type="file"], [data-testid="resource-upload"], text=/drag.*drop|upload resource/i').first();
      return (await dropzone.count())
        ? { status: "pass", notes: "Upload control present" }
        : { status: "not_built", notes: "/resources is a static marketing page; instructor upload UI missing" };
    });
  });
});