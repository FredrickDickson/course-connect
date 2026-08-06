import { test, expect } from "@playwright/test";

// The seeded student has no `members` row linked via user_id, which is the
// realistic state for most students (membership renewal is a separate track
// from course enrollment) — covers the "nothing to renew" state. The paid
// renewal path goes through Paystack (out of scope, same as checkout).
test.describe("Renew membership (/renew-membership, student)", () => {
  test("a student with no linked membership sees a no-active-membership state", async ({ page }) => {
    await page.goto("/renew-membership");
    // The pricing query 404s for a student with no membership, and React
    // Query's default retry (3x exponential backoff) delays settling by
    // several seconds before this state renders.
    await expect(page.getByRole("heading", { name: "No Active Membership" })).toBeVisible({ timeout: 15_000 });
  });
});
