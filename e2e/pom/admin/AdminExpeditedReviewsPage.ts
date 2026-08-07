import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class AdminExpeditedReviewsPage extends BasePage {
  readonly searchInput = this.page.getByPlaceholder("Name, email, reference");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/admin/expedited");
  }
}
