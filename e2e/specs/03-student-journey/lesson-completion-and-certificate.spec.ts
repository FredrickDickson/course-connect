import { test, expect } from "@playwright/test";
import { CertificateOfCompletionPage } from "../../pom/CertificateOfCompletionPage";
import { getSeededCertificationId } from "../../fixtures/seeded-certification";
import { E2E_SEED_COURSE_TITLE } from "../../fixtures/test-users";

/**
 * KNOWN PRODUCT GAP (not a test bug — confirmed by reading the source):
 * completing all lessons in a course is supposed to auto-create a
 * `certifications` row (server/routes/enrollments.ts, POST
 * /api/enrollments/progress), but nothing in the client ever calls that
 * route — client/src/pages/video-player.tsx writes lesson progress directly
 * to Supabase instead. So today, completing a course via the real UI never
 * produces a certificate for any user. Tracked for product follow-up, not
 * fixed here (user decision). The certification row this spec exercises is
 * seeded directly (e2e/setup/seed-test-data.ts), bypassing that broken path,
 * so the certificate-of-completion PAGE itself can still be verified.
 */
test.describe("Certificate of completion (/certificates/completion/:id)", () => {
  test("an owner can view and preview their certificate", async ({ page }) => {
    const certId = await getSeededCertificationId();
    const cert = new CertificateOfCompletionPage(page);
    await cert.goto(certId);
    await expect(cert.heading).toBeVisible();
    await expect(page.getByText(E2E_SEED_COURSE_TITLE)).toBeVisible();
    await cert.generatePreviewButton.click();
    await expect(page.locator("iframe[title='Certificate of Completion Preview']")).toBeVisible({ timeout: 15_000 });
  });

  test("an unknown certification id shows a not-found state", async ({ page }) => {
    const cert = new CertificateOfCompletionPage(page);
    await cert.goto("00000000-0000-0000-0000-000000000000");
    await expect(cert.notFoundMessage).toBeVisible();
  });
});
