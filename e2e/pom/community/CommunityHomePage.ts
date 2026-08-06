import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CommunityHomePage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "CIMA Community" });
  readonly myBoardsLink = this.page.getByRole("link", { name: "My Course Boards" });
  readonly myPostsLink = this.page.getByRole("link", { name: "My Posts" });
  readonly notificationsLink = this.page.getByRole("link", { name: /notifications/i });
  readonly newPostButton = this.page.getByRole("button", { name: "New Post" }).first();

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/community");
  }
}
