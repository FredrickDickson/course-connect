import { test, expect, record } from "./fixtures/audit";
import { login } from "./fixtures/users";

test.describe("Certificates", () => {
  test("certification page lists certificates (or empty state)", async ({ page }, info) => {
    await record(info, "cert:list", async () => {
      await login(page, "student");
      const r = await page.goto("/certification");
      if (!r || !r.ok()) return { status: "broken", notes: `HTTP ${r?.status()}` };
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (/certificate/i.test(text)) return { status: "pass" };
      return { status: "partial", notes: "No certificate copy on page" };
    });
  });

  test("certificate preview opens", async ({ page }, info) => {
    await record(info, "cert:preview", async () => {
      await login(page, "student");
      await page.goto("/certification");
      await page.waitForTimeout(1500);
      const previewBtn = page.locator('button:has-text("Preview"), button:has-text("View")').first();
      if (!(await previewBtn.count())) return { status: "not_built", notes: "No preview button — student has no certificate" };
      await previewBtn.click();
      await page.waitForTimeout(1500);
      const iframe = page.locator('iframe').first();
      return (await iframe.count()) ? { status: "pass", notes: "PDF iframe rendered" } : { status: "broken", notes: "No iframe after preview click" };
    });
  });
});