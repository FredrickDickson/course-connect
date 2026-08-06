import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class InstructorDashboardPage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "Instructor Dashboard" });
  readonly createCourseButton = this.page.getByRole("link", { name: /create course/i }).first();
  readonly overviewTab = this.page.getByRole("tab", { name: "Overview" });
  readonly coursesTab = this.page.getByRole("tab", { name: /courses/i });
  readonly communityTab = this.page.getByRole("tab", { name: "Community" });
  readonly analyticsTab = this.page.getByRole("tab", { name: "Analytics" });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.gotoAndWait("/instructor");
  }
}
