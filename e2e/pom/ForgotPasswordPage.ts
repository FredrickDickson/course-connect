import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ForgotPasswordPage extends BasePage {
  readonly emailInput = this.page.locator("#email");
  readonly submitButton = this.page.getByRole("button", { name: /send reset link/i });
  readonly successAlert = this.page.locator('text=/check your email/i');
  readonly backToSignInLink = this.page.getByRole("link", { name: /back to sign in/i });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/forgot-password");
  }

  async requestReset(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
