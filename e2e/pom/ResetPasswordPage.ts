import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ResetPasswordPage extends BasePage {
  readonly passwordInput = this.page.locator("#password");
  readonly confirmPasswordInput = this.page.locator("#confirmPassword");
  readonly submitButton = this.page.getByRole("button", { name: /update password/i });
  readonly invalidLinkError = this.page.locator("text=/invalid or expired reset link/i");
  readonly successAlert = this.page.locator("text=/password updated successfully/i");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/reset-password");
  }
}
