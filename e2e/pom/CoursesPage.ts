import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/** client/src/pages/courses.tsx — protected "/courses" route, unlike public /course-catalog. */
export class CoursesPage extends BasePage {
  readonly professionalProgrammeTab = this.page.getByTestId("tab-professional-programme");
  readonly adjunctCoursesTab = this.page.getByTestId("tab-adjunct-courses");
  readonly searchInput = this.page.getByTestId("input-search");
  readonly categorySelect = this.page.getByTestId("select-category");
  readonly levelSelect = this.page.getByTestId("select-level");
  readonly priceSelect = this.page.getByTestId("select-price");
  readonly sortSelect = this.page.getByTestId("select-sort");
  readonly gridViewButton = this.page.getByTestId("button-grid-view");
  readonly listViewButton = this.page.getByTestId("button-list-view");
  readonly resultsCount = this.page.getByTestId("results-count");
  readonly emptyState = this.page.getByTestId("empty-state");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/courses");
  }
}
