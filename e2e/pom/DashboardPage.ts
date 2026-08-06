import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class DashboardPage extends BasePage {
  // Greeting is time-of-day based ("Good morning/afternoon/evening, {name}"),
  // not a fixed "Welcome back" string.
  readonly welcomeHeading = this.page.getByRole("heading", { name: /^good (morning|afternoon|evening)/i });
  readonly myCoursesHeading = this.page.getByRole("heading", { name: "My Courses" });
  // "View All" links to /courses (the full My Courses list) — the seeded
  // student always has an enrollment, so the empty-state's /course-catalog
  // link is never reachable in this scenario.
  readonly browseCoursesLink = this.page.getByRole("link", { name: "View All" });
  readonly certificatesHeading = this.page.getByText("Certificates", { exact: true });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/dashboard");
  }
}
