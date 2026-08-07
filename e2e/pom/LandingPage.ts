import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LandingPage extends BasePage {
  readonly loginLink = this.page.getByRole("link", { name: "Login", exact: true });
  readonly createAccountLink = this.page.getByRole("link", { name: "Create Account", exact: true });
  // Bottom-of-page CTA — a <button> nested inside a <Link>'s <a>.
  readonly browseCoursesLink = this.page.getByRole("button", { name: "Browse Courses" });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/");
  }
}
