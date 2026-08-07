import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CourseCatalogPage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "Course Catalog" });
  readonly searchInput = this.page.getByPlaceholder("Search courses...");
  readonly clearFiltersButton = this.page.getByRole("button", { name: /clear/i });
  readonly noCoursesMessage = this.page.getByText("No courses match your filters.");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/course-catalog");
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  /** The level filter is a shadcn Select with no id/testid — open by its current label, pick the option by text. */
  async filterByLevel(optionLabel: "All Levels" | "Part I (Associate)" | "Part II (Member)" | "Part III (Fellow)") {
    await this.page.getByRole("combobox").first().click();
    await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
  }

  viewCourseButton(nth = 0) {
    return this.page.getByRole("button", { name: /view course|join waitlist/i }).nth(nth);
  }
}
