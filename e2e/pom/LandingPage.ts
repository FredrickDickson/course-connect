import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LandingPage extends BasePage {
  readonly memberPortalLink = this.page.getByRole("button", { name: "Member Portal" });
  readonly browseCoursesLink = this.page.getByRole("button", { name: "Browse Courses" });
  readonly beginAscensionLink = this.page.getByRole("button", { name: "Begin Your Ascension" });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/");
  }
}
