import { test, expect } from "@playwright/test";
import { AdminDashboardPage } from "../../pom/admin/AdminDashboardPage";

test.describe("Admin dashboard (/admin) — tab smoke coverage", () => {
  test("loads with the Overview tab active", async ({ page }) => {
    const admin = new AdminDashboardPage(page);
    await admin.goto();
    await expect(admin.heading).toBeVisible();
    await expect(admin.overviewTab).toHaveAttribute("data-state", "active");
  });

  for (const tabName of ["enrollmentsTab", "coursesTab", "templatesTab", "membersTab", "renewalsTab", "usersTab"] as const) {
    test(`${tabName} switches without crashing`, async ({ page }) => {
      const admin = new AdminDashboardPage(page);
      await admin.goto();
      await admin[tabName].click();
      await expect(admin[tabName]).toHaveAttribute("data-state", "active");
    });
  }

  test("Expedited Reviews link navigates to /admin/expedited", async ({ page }) => {
    const admin = new AdminDashboardPage(page);
    await admin.goto();
    await admin.expeditedReviewsLink.click();
    await expect(page).toHaveURL(/\/admin\/expedited/);
  });
});

test.describe("Admin dashboard — instructor applications review", () => {
  test("approving the seeded pending application grants instructor access", async ({ page }) => {
    const admin = new AdminDashboardPage(page);
    await admin.goto();
    await admin.applicationsTab.click();
    await expect(page.getByRole("heading", { name: "Instructor Applications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending Review" })).toBeVisible();

    // Pending cards render before reviewed ones (pendingApps.map runs first
    // in source) — the seed script guarantees exactly one pending row for
    // this applicant at a time, so the first matching Card is it. Scoped to
    // the Card's own distinguishing class (not a bare "div" filter, which
    // also matches every ancestor wrapper div containing the same text).
    const pendingCard = page.locator(".hover\\:shadow-md").filter({ hasText: "E2E Applicant" }).first();
    await pendingCard.getByRole("button", { name: /review/i }).click();

    await expect(page.getByRole("heading", { name: /Instructor Application - E2E Applicant/i })).toBeVisible();
    await page.getByRole("button", { name: /^approve$/i }).click();
    // Confirmation AlertDialog — same accessible name "Approve" on its action button.
    await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click();

    await expect(page.getByText("Instructor Approved!", { exact: true })).toBeVisible();
  });
});
