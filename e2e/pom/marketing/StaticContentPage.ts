import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * Generic POM for the low-interactivity marketing/legal pages: heading
 * present, key nav chrome renders, page reachable. These pages all use a
 * real <h1> (some via data-testid="title", some hardcoded text, some i18n)
 * so a role-based heading locator covers all of them uniformly.
 */
export class StaticContentPage extends BasePage {
  constructor(
    page: Page,
    private readonly path: string,
    private readonly headingText: string,
  ) {
    super(page);
  }

  get heading() {
    return this.page.getByRole("heading", { name: this.headingText, level: 1 });
  }

  async goto() {
    await this.gotoAndWait(this.path);
  }
}
