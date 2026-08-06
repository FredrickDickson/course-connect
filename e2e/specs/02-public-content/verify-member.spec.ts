import { test, expect } from "@playwright/test";
import { E2E_SEED_VALID_MEMBER_ID, E2E_SEED_EXPIRED_MEMBER_ID } from "../../fixtures/test-users";

test.describe("Member verification (/verify/:memberId, public)", () => {
  test("unknown member id shows a not-found state", async ({ page }) => {
    await page.goto("/verify/NO-SUCH-MEMBER-ID");
    await expect(page.getByRole("heading", { name: "Member Not Found" })).toBeVisible();
  });

  test("a valid, unexpired member shows a VALID badge with their details", async ({ page }) => {
    await page.goto(`/verify/${E2E_SEED_VALID_MEMBER_ID}`);
    await expect(page.getByText("✓ VALID")).toBeVisible();
    // verify_member() redacts to "First L." (first name + last initial) for PII protection.
    await expect(page.getByText("E2E V.")).toBeVisible();
    await expect(page.getByText(E2E_SEED_VALID_MEMBER_ID)).toBeVisible();
  });

  test("an expired member shows an EXPIRED badge", async ({ page }) => {
    await page.goto(`/verify/${E2E_SEED_EXPIRED_MEMBER_ID}`);
    await expect(page.getByText("✗ EXPIRED")).toBeVisible();
    await expect(page.getByText("E2E E.")).toBeVisible();
  });

  test("does not require authentication", async ({ page }) => {
    const response = await page.goto(`/verify/${E2E_SEED_VALID_MEMBER_ID}`);
    expect(response?.ok()).toBeTruthy();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
