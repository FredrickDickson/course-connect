import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class VerifyEmailPage extends BasePage {
  // shadcn's CardTitle renders a plain <div>, not a semantic heading element,
  // so there's no "heading" role in the accessibility tree to match on.
  readonly heading = this.page.getByText("Check your email", { exact: true });
  readonly resendButton = this.page.getByRole("button", { name: /resend verification email/i });
  readonly resentConfirmation = this.page.getByRole("button", { name: /email resent/i });
  readonly backToSignInLink = this.page.getByRole("link", { name: /back to sign in/i });

  constructor(page: Page) {
    super(page);
  }

  async goto(email?: string) {
    const url = email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email";
    await this.page.goto(url);
  }
}
