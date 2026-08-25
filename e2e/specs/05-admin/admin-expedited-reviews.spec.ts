import { test, expect } from "@playwright/test";
import { AdminExpeditedReviewsPage } from "../../pom/admin/AdminExpeditedReviewsPage";
import { supabaseAdmin } from "../../fixtures/db";
import { TEST_USERS } from "../../fixtures/test-users";

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

  test("reviews and approves a submitted applicant to Member", async ({ page }) => {
    const applicantEmail = TEST_USERS.expeditedApplicant.email;
    const applicantFullName = `${TEST_USERS.expeditedApplicant.firstName} ${TEST_USERS.expeditedApplicant.lastName}`;

    const reviews = new AdminExpeditedReviewsPage(page);
    await reviews.goto();

    await reviews.searchAndWait(applicantEmail);
    await expect(reviews.reviewRow(applicantFullName)).toBeVisible();

    await reviews.openReview(applicantFullName);
    await expect(reviews.drawer).toContainText("Applying for MEMBER on the Arbitration track");
    await expect(reviews.drawer.getByText("seed-cv.pdf")).toBeVisible();

    await reviews.decide("Upgrade to Member", "Verified credentials, approving.");
    // "Decision recorded" also appears inside a separate aria-live
    // announcement region ("Notification Decision recorded") — exact:true
    // disambiguates to just the toast itself.
    await expect(page.getByText("Decision recorded", { exact: true })).toBeVisible();

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", applicantEmail.toLowerCase())
      .single();
    if (userError || !user) throw userError ?? new Error("Seeded applicant not found");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("professional_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_current", true)
      .single();
    if (profileError || !profile) throw profileError ?? new Error("Applicant profile not found");

    expect(profile.review_status).toBe("APPROVED");
    expect(profile.assigned_level).toBe("MEMBER");
    expect(profile.decision_at).not.toBeNull();

    const { data: userRow, error: userRowError } = await supabaseAdmin
      .from("users")
      .select("assigned_level, current_level, level_source")
      .eq("id", user.id)
      .single();
    if (userRowError || !userRow) throw userRowError ?? new Error("Applicant user row not found");

    expect(userRow.assigned_level).toBe("MEMBER");
    expect(userRow.level_source).toBe("EXPEDITED");
  });
});
