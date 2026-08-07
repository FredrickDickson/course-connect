import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CreateCoursePage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "Create New Course" });
  readonly titleInput = this.page.getByLabel("Course Title *");
  readonly subtitleInput = this.page.getByLabel("Course Subtitle *");
  readonly descriptionInput = this.page.getByLabel("Course Description *");
  readonly priceInput = this.page.getByLabel("Price *");
  readonly submitButton = this.page.getByRole("button", { name: /create course/i });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.gotoAndWait("/instructor/courses/new");
  }

  /** Both Course Type and Difficulty Level / Track are shadcn Selects with a FormLabel, not native <select>s. */
  async selectByLabel(labelText: string, optionText: string) {
    await this.page.getByLabel(labelText).click();
    await this.page.getByRole("option", { name: optionText }).click();
  }

  async selectCategory(optionText: string) {
    await this.page.getByLabel("Category *").click();
    await this.page.getByRole("option", { name: optionText }).click();
  }
}
