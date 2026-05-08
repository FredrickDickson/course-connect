import { test, expect, record } from "./fixtures/audit";
import { login } from "./fixtures/users";

test.describe("Community", () => {
  test("community forum loads", async ({ page }, info) => {
    await record(info, "community:forum", async () => {
      await login(page, "student");
      const r = await page.goto("/community");
      if (!r || !r.ok()) return { status: "broken", notes: `HTTP ${r?.status()}` };
      await page.waitForTimeout(1500);
      return { status: "pass" };
    });
  });

  test("create post form reachable", async ({ page }, info) => {
    await record(info, "community:create-post", async () => {
      await login(page, "student");
      await page.goto("/community/create-post");
      await page.waitForTimeout(1000);
      const editor = page.locator('textarea, [contenteditable="true"], input[name="title"]').first();
      return (await editor.count()) ? { status: "pass" } : { status: "broken", notes: "Editor missing" };
    });
  });
});