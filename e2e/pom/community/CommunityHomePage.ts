import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CommunityHomePage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "CIMA Community" });
  // Scoped to <main> — the page's own sub-nav duplicates these same link
  // names in the global StudentLayout sidebar (role="complementary").
  private readonly main = this.page.getByRole("main");
  readonly myBoardsLink = this.main.getByRole("link", { name: "My Course Boards" });
  readonly myPostsLink = this.main.getByRole("link", { name: "My Posts" });
  readonly notificationsLink = this.main.getByRole("link", { name: /notifications/i });
  readonly newPostButton = this.page.getByRole("button", { name: "New Post" }).first();

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/community");
  }
}
