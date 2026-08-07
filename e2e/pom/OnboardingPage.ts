import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class OnboardingPage extends BasePage {
  // Step 1 — Personal Information
  readonly dobTrigger = this.page.locator("#date-of-birth");
  readonly cityInput = this.page.locator("#city");
  readonly phoneInput = this.page.locator("#phone");
  readonly addressInput = this.page.locator("#address");
  // The button's visible text is "Save & Continue", but an explicit
  // aria-label overrides its accessible name — match on that instead.
  readonly saveAndContinueButton = this.page.getByRole("button", {
    name: /save personal information and continue/i,
  });

  // Step 2 — ADR experience gate
  readonly noExperienceButton = this.page.getByRole("button", { name: /No, I'm getting started/i });
  readonly yesExperienceButton = this.page.getByRole("button", { name: /Yes, I have ADR\s+experience/i });
  readonly experienceGateHeading = this.page.getByText("ADR Experience", { exact: true });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/onboarding");
  }

  /**
   * Opens the DOB calendar popover (react-aria-components based) and picks a
   * date via its month/year <select>s (1-indexed month values, no
   * aria-label — scoped by position within the popover's <header>) and its
   * day grid cells, whose accessible name is the full spelled-out date
   * (e.g. "Wednesday, January 15, 2000"), not a data-day attribute.
   */
  async setDateOfBirth(year: number, monthIndexZeroBased: number, day: number) {
    await this.dobTrigger.click();
    const popover = this.page.getByRole("dialog");
    await popover.locator("header select").nth(0).selectOption(String(monthIndexZeroBased + 1));
    await popover.locator("header select").nth(1).selectOption(String(year));
    const dayLabel = new Date(year, monthIndexZeroBased, day).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    await popover.getByRole("button", { name: dayLabel, exact: true }).click();
  }

  async selectGender(gender: "Male" | "Female" | "Prefer not to say") {
    await this.page.getByRole("button", { name: gender, exact: true }).click();
  }

  /** Both Nationality and Country of Residence use the same shadcn Select + country list. */
  async selectFromCountryDropdown(triggerId: "nationality" | "country", countryName: string) {
    await this.page.locator(`#${triggerId}`).click();
    await this.page.getByRole("option", { name: countryName, exact: true }).click();
  }

  async fillStep1({
    dob = { year: 2000, monthIndexZeroBased: 0, day: 15 },
    gender = "Prefer not to say",
    nationality = "Ghana",
    country = "Ghana",
    city = "Accra",
    phone = "0244000000",
    address = "123 Test Street",
  }: {
    dob?: { year: number; monthIndexZeroBased: number; day: number };
    gender?: "Male" | "Female" | "Prefer not to say";
    nationality?: string;
    country?: string;
    city?: string;
    phone?: string;
    address?: string;
  } = {}) {
    await this.setDateOfBirth(dob.year, dob.monthIndexZeroBased, dob.day);
    await this.selectGender(gender);
    await this.selectFromCountryDropdown("nationality", nationality);
    await this.selectFromCountryDropdown("country", country);
    await this.cityInput.fill(city);
    await this.phoneInput.fill(phone);
    await this.addressInput.fill(address);
  }

  async submitStep1() {
    await this.saveAndContinueButton.click();
  }
}
