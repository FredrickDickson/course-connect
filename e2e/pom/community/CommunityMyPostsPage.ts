import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CommunityMyPostsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/community/my-posts");
  }
}
