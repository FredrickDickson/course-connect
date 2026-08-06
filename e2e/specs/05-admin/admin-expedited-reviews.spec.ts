import { test, expect } from "@playwright/test";
import { AdminExpeditedReviewsPage } from "../../pom/admin/AdminExpeditedReviewsPage";

test.describe("Admin expedited reviews (/admin/expedited)", () => {
  test("loads with the reviews heading and search input", async ({ page }) => {
    const reviews = new AdminExpeditedReviewsPage(page);
    await reviews.goto();
    await expect(page.getByRole("heading", { name: "Professional Profile Reviews" })).toBeVisible();
    await expect(reviews.searchInput).toBeVisible();
  });

  test("status filter defaults to Under Review", async ({ page }) => {
    const reviews = new AdminExpeditedReviewsPage(page);
    await reviews.goto();
    await expect(page.getByText("Under Review").first()).toBeVisible();
  });
});
