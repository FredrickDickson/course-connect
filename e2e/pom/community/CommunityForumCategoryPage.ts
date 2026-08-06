import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CommunityForumCategoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(slug: string) {
    await this.page.goto(`/community/forums/${slug}`);
  }
}
