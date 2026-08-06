import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CheckoutPage } from "../../pom/CheckoutPage";
import { getSeededCourseId } from "../../fixtures/seeded-course";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "setup", ".auth");

// Real Paystack payment is out of scope (per project decision) — these cover
// the pre-payment review step and the guards around it (already-enrolled,
// unknown course). "Proceed to Payment" is not clicked.
test.describe("Checkout (/checkout/:courseId, student)", () => {
  test("an already-enrolled student is redirected straight to the lesson player", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const checkout = new CheckoutPage(page);
    await checkout.goto(courseId);
    await page.waitForURL(new RegExp(`/learn/${courseId}/1`), { timeout: 10_000 });
  });

  test("unknown course id shows a not-found state", async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto("00000000-0000-0000-0000-000000000000");
    await expect(checkout.courseNotFoundHeading).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Checkout — not-yet-enrolled review step", () => {
  test.use({ storageState: path.join(authDir, "unenrolled-student.json") });

  test("shows the course review, price, and student info before any payment step", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const checkout = new CheckoutPage(page);
    await checkout.goto(courseId);
    await expect(checkout.reviewHeading).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
    await expect(page.getByText("Uma Unenrolled")).toBeVisible();
  });

  test("Proceed to Payment advances to the payment-method step without starting real payment", async ({ page }) => {
    const courseId = await getSeededCourseId();
    const checkout = new CheckoutPage(page);
    await checkout.goto(courseId);
    await checkout.proceedToPaymentButton.click();
    await expect(page.getByRole("heading", { name: "Choose Payment Method" })).toBeVisible();
    await expect(page.getByText("Pay with Card / Mobile Money")).toBeVisible();
  });
});
