import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  readonly emailInput = this.page.locator('input[name="email"]');
  readonly passwordInput = this.page.locator('input[name="password"]');
  readonly submitButton = this.page.locator('button[type="submit"]');
  readonly errorAlert = this.page.locator('[role="alert"], .text-destructive').first();
  readonly forgotPasswordLink = this.page.getByRole("link", { name: /forgot password/i });
  readonly registerLink = this.page.getByRole("link", { name: /get started/i });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Login triggers a full-page redirect (window.location.href), not a soft SPA nav. */
  async loginAndWaitForRedirect(email: string, password: string) {
    await this.login(email, password);
    await this.page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
  }
}
