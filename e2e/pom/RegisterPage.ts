import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class RegisterPage extends BasePage {
  readonly firstNameInput = this.page.locator('input[name="firstName"]');
  readonly lastNameInput = this.page.locator('input[name="lastName"]');
  readonly emailInput = this.page.locator('input[name="email"]');
  readonly passwordInput = this.page.locator('input[name="password"]');
  readonly confirmPasswordInput = this.page.locator('input[name="confirmPassword"]');
  readonly agreeToTermsCheckbox = this.page.locator("#agreeToTerms");
  readonly submitButton = this.page.getByRole("button", { name: /create account/i });
  readonly errorAlert = this.page.locator('[role="alert"]').first();

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/register");
  }

  async fillForm(opts: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    agreeToTerms?: boolean;
  }) {
    await this.firstNameInput.fill(opts.firstName);
    await this.lastNameInput.fill(opts.lastName);
    await this.emailInput.fill(opts.email);
    await this.passwordInput.fill(opts.password);
    await this.confirmPasswordInput.fill(opts.confirmPassword ?? opts.password);
    if (opts.agreeToTerms !== false) {
      await this.agreeToTermsCheckbox.click();
    }
  }

  async submit() {
    await this.submitButton.click();
  }
}
