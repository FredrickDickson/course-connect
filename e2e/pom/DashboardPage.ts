import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  readonly welcomeHeading = this.page.getByRole("heading", { name: /welcome back/i });
  readonly myCoursesHeading = this.page.getByRole("heading", { name: "My Courses" });
  readonly browseCoursesLink = this.page.getByRole("link", { name: "Browse Courses" });
  readonly certificatesHeading = this.page.getByText("Certificates", { exact: true });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/dashboard");
  }
}
