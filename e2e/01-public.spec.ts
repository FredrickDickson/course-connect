import { test, expect, record } from "./fixtures/audit";

const PUBLIC_ROUTES = [
  "/", "/courses", "/programs", "/resources", "/verify-member",
  "/help-center", "/contact", "/privacy-policy", "/terms-of-service",
  "/login", "/register",
];

test.describe("Public routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`renders ${route}`, async ({ page }, info) => {
      await record(info, `public:${route}`, async () => {
        const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
        if (!resp || !resp.ok()) return { status: "broken", notes: `HTTP ${resp?.status()}` };
        const errorVisible = await page.locator("text=/something went wrong|404|not found/i").first().isVisible().catch(() => false);
        if (errorVisible) return { status: "broken", notes: "Error UI rendered" };
        const h1 = await page.locator("h1, h2").first().innerText().catch(() => "");
        return { status: "pass", notes: `H: ${h1.slice(0, 60)}` };
      });
    });
  }

  test("verify-member RPC accepts a member id", async ({ page }, info) => {
    await record(info, "public:verify-member-rpc", async () => {
      await page.goto("/verify-member");
      const input = page.locator('input').first();
      if (!(await input.count())) return { status: "not_built", notes: "No input field" };
      await input.fill("000000");
      await page.locator('button:has-text("Verify"), button[type="submit"]').first().click().catch(() => null);
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      if (/not found|invalid|no record/i.test(text)) return { status: "pass", notes: "Returned no-match (expected for fake id)" };
      if (/error/i.test(text)) return { status: "broken", notes: "Error surfaced" };
      return { status: "partial", notes: "No clear feedback" };
    });
  });
});