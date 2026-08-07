import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  readonly statEnrolledCourses = this.page.getByTestId("stat-enrolled-courses");
  readonly statCompletedCourses = this.page.getByTestId("stat-completed-courses");
  readonly statStudyHours = this.page.getByTestId("stat-study-hours");
  readonly viewAllCoursesButton = this.page.getByTestId("button-view-all-courses");
  readonly browseCoursesButton = this.page.getByTestId("button-browse-courses");
  readonly explorePropramsButton = this.page.getByTestId("button-explore-programs");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    // "/" now hard-redirects authenticated users straight to /dashboard
    // (App.tsx) — the authenticated Home experience lives at /home instead.
    await this.page.goto("/home");
  }

  enrollmentCard(courseId: string) {
    return this.page.getByTestId(`card-enrollment-${courseId}`);
  }

  continueLearningButton(courseId: string) {
    return this.page.getByTestId(`button-continue-${courseId}`);
  }
}
