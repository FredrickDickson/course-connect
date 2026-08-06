import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CommunityCreatePostPage extends BasePage {
  // shadcn's CardTitle renders a plain <div>, not a semantic heading element,
  // so there's no "heading" role in the accessibility tree to match on.
  readonly heading = this.page.getByText("Create New Topic", { exact: true });
  readonly boardSelect = this.page.locator("#board");
  readonly titleInput = this.page.locator("#title");
  readonly editor = this.page.locator(".ProseMirror");
  readonly submitButton = this.page.getByRole("button", { name: /post topic|creating/i });

  constructor(page: Page) {
    super(page);
  }

  async goto(categorySlug: string) {
    await this.page.goto(`/community/forums/${categorySlug}/new`);
  }

  async selectBoard(boardName: string) {
    await this.boardSelect.click();
    await this.page.getByRole("option", { name: boardName }).click();
  }

  async fillBody(text: string) {
    await this.editor.click();
    await this.editor.pressSequentially(text);
  }
}
