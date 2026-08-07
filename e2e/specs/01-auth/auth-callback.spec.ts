import { test, expect } from "@playwright/test";

test.describe("Auth callback", () => {
  // /auth/callback is the landing point for Google OAuth redirects. It isn't
  // feasible to drive real Google OAuth in this suite, so this covers the one
  // branch that's reachable without it: visiting the callback URL with no
  // Supabase session at all (e.g. a stale/reloaded/direct-linked callback).
  test("with no session, redirects to /login", async ({ page }) => {
    await page.goto("/auth/callback");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
