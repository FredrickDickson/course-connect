import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class AdminDashboardPage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "Admin Dashboard" });
  readonly overviewTab = this.page.getByRole("tab", { name: "Overview" });
  readonly enrollmentsTab = this.page.getByRole("tab", { name: "Enrollments" });
  readonly coursesTab = this.page.getByRole("tab", { name: "Courses" });
  readonly templatesTab = this.page.getByRole("tab", { name: "Templates" });
  readonly membersTab = this.page.getByRole("tab", { name: "Members" });
  readonly renewalsTab = this.page.getByRole("tab", { name: "Renewals" });
  readonly applicationsTab = this.page.getByRole("tab", { name: /applications/i });
  readonly usersTab = this.page.getByRole("tab", { name: "Users" });
  readonly expeditedReviewsLink = this.page.getByRole("link", { name: "Expedited Reviews" });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.gotoAndWait("/admin");
  }
}
