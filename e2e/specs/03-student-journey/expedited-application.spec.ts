import { test, expect } from "@playwright/test";
import { ExpeditedApplicationPage } from "../../pom/ExpeditedApplicationPage";
import { supabaseAdmin } from "../../fixtures/db";
import { TEST_USERS } from "../../fixtures/test-users";

// Full multi-step form submission (track/level selection, document upload)
// is covered indirectly by 01-auth/onboarding.spec.ts's "Yes" branch, which
// verifies landing here from onboarding. This covers direct access as an
// already-logged-in student with no existing professional profile.
test.describe("Expedited application (/expedited-application, student)", () => {
  test("shows the qualification track selection for a student with no existing application", async ({ page }) => {
    await page.goto("/expedited-application");
    await expect(page.getByText("Qualification Track")).toBeVisible();
    await expect(page.getByText("Target Qualification Level")).toBeVisible();
  });

  test("submits a complete application and shows the under-review status", async ({ page }) => {
    const application = new ExpeditedApplicationPage(page);
    await application.goto();

    let profileId: string | undefined;
    let storagePaths: string[] = [];

    try {
      await application.fillCoreForm({
        targetLevel: "MEMBER",
        primaryProfession: "Lawyer",
        currentOrganization: "E2E Test Chambers",
        yearsPostQualification: "5-10 years",
        countryOfPractice: "Ghana",
        hasLawDegree: true,
        hasLlm: false,
        hasPriorAdrTraining: true,
        adrInstitution: "CIArb",
        experienceSummary: "Ten years arbitrating commercial disputes across West Africa.",
        qualificationsSummary: "LLB (Hons), Called to the Ghana Bar, CIArb Diploma.",
      });
      await application.uploadCv();
      await application.uploadCertificate();
      await application.submit();

      await expect(application.successMessage).toBeVisible({ timeout: 15_000 });
      await expect(application.underReviewBanner).toBeVisible();

      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", TEST_USERS.student.email.toLowerCase())
        .single();
      if (userError || !user) throw userError ?? new Error("Seeded student not found");

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("professional_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .single();
      if (profileError || !profile) throw profileError ?? new Error("Submitted profile not found");

      expect(profile.review_status).toBe("UNDER_REVIEW");
      expect(profile.track).toBe("ARBITRATION");
      expect(profile.self_assessed_level).toBe("MEMBER");
      expect(profile.submitted_payload?.primaryProfession).toBe("Lawyer");
      expect(profile.submitted_payload?.countryOfPractice).toBe("Ghana");

      profileId = profile.id;

      const { data: docs, error: docsError } = await supabaseAdmin
        .from("professional_documents")
        .select("*")
        .eq("profile_id", profile.id);
      if (docsError) throw docsError;

      expect(docs?.some((d) => d.document_type === "CV" && d.original_name === "cv.pdf")).toBe(true);
      expect(docs?.some((d) => d.document_type === "CERTIFICATE")).toBe(true);
      storagePaths = (docs ?? []).map((d) => d.storage_path).filter((p): p is string => Boolean(p));
    } finally {
      // Restore TEST_USERS.student to its pre-test baseline (no professional
      // profile) so this shared, cross-spec fixture isn't left mutated.
      if (storagePaths.length) {
        await supabaseAdmin.storage.from("expedited-documents").remove(storagePaths);
      }
      if (profileId) {
        await supabaseAdmin.from("professional_documents").delete().eq("profile_id", profileId);
        await supabaseAdmin.from("professional_profiles").delete().eq("id", profileId);
      }
    }
  });
});
