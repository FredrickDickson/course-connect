import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ExpeditedApplicationPage extends BasePage {
  readonly targetLevelMemberButton = this.page.getByRole("button", { name: /Member \(MCIMArb\)/i });
  readonly targetLevelFellowButton = this.page.getByRole("button", { name: /Fellow \(FCIMArb\)/i });

  readonly currentOrganizationInput = this.page.locator("#current-organization");
  readonly adrInstitutionInput = this.page.locator("#adr-institution");
  readonly experienceTextarea = this.page.locator("#experience");
  readonly qualificationsTextarea = this.page.locator("#qualifications");

  readonly cvUploadInput = this.page.locator("#cv-upload");
  readonly certificateUploadInput = this.page.locator("#certificate-upload");
  readonly degreeUploadInput = this.page.locator("#degree-upload");
  readonly transcriptUploadInput = this.page.locator("#transcript-upload");

  readonly submitButton = this.page.getByRole("button", { name: /submit for review/i });
  readonly successMessage = this.page.getByText(/Profile submitted successfully/i);
  readonly underReviewBanner = this.page.getByText("Your profile is under review");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/expedited-application");
  }

  /** Primary Profession, Years Post-Qualification Experience, Country of Practice — all the same shadcn Select pattern. */
  async selectFromDropdown(
    triggerId: "primary-profession" | "years-post-qual" | "country-of-practice",
    optionLabel: string,
  ) {
    await this.page.locator(`#${triggerId}`).click();
    await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
  }

  /**
   * The triage section repeats "Yes"/"No" as the accessible name of 3-4
   * button pairs, so they can't be selected by name alone. Each pair's
   * <Label> and its button-row <div> are both direct children of the same
   * wrapping <div className="space-y-3">, with the button row immediately
   * following the Label — so scoping via `following-sibling::div[1]` of the
   * label text reliably isolates just that question's Yes/No row.
   */
  private yesNoRowFor(labelText: string) {
    return this.page.getByText(labelText, { exact: false }).locator("xpath=following-sibling::div[1]");
  }

  async answerHasLawDegree(yes: boolean) {
    await this.yesNoRowFor("Do you hold a Law Degree")
      .getByRole("button", { name: yes ? "Yes" : "No", exact: true })
      .click();
  }

  async answerHasLlm(yes: boolean) {
    await this.yesNoRowFor("Do you hold an LLM")
      .getByRole("button", { name: yes ? "Yes" : "No", exact: true })
      .click();
  }

  async answerLlmAdrFocus(yes: boolean) {
    await this.yesNoRowFor("Was your LLM focused on ADR")
      .getByRole("button", { name: yes ? "Yes" : "No", exact: true })
      .click();
  }

  async answerHasPriorAdrTraining(yes: boolean) {
    await this.yesNoRowFor("Have you completed any previous ADR training")
      .getByRole("button", { name: yes ? "Yes" : "No", exact: true })
      .click();
  }

  async fillCoreForm(opts: {
    targetLevel: "MEMBER" | "FELLOW";
    primaryProfession: string;
    currentOrganization: string;
    yearsPostQualification: string;
    countryOfPractice: string;
    hasLawDegree: boolean;
    hasLlm: boolean;
    llmAdrFocus?: boolean;
    hasPriorAdrTraining: boolean;
    adrInstitution?: string;
    experienceSummary: string;
    qualificationsSummary: string;
  }) {
    await (opts.targetLevel === "MEMBER" ? this.targetLevelMemberButton : this.targetLevelFellowButton).click();

    await this.selectFromDropdown("primary-profession", opts.primaryProfession);
    await this.currentOrganizationInput.fill(opts.currentOrganization);
    await this.selectFromDropdown("years-post-qual", opts.yearsPostQualification);
    await this.selectFromDropdown("country-of-practice", opts.countryOfPractice);

    await this.answerHasLawDegree(opts.hasLawDegree);
    await this.answerHasLlm(opts.hasLlm);
    if (opts.hasLlm && opts.llmAdrFocus !== undefined) {
      await this.answerLlmAdrFocus(opts.llmAdrFocus);
    }
    await this.answerHasPriorAdrTraining(opts.hasPriorAdrTraining);
    if (opts.hasPriorAdrTraining && opts.adrInstitution) {
      await this.adrInstitutionInput.fill(opts.adrInstitution);
    }

    await this.experienceTextarea.fill(opts.experienceSummary);
    await this.qualificationsTextarea.fill(opts.qualificationsSummary);
  }

  async uploadCv(fileName = "cv.pdf") {
    await this.cvUploadInput.setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e test cv"),
    });
  }

  async uploadCertificate(fileName = "certificate.pdf") {
    await this.certificateUploadInput.setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 e2e test certificate"),
    });
  }

  async submit() {
    await this.submitButton.click();
  }
}
