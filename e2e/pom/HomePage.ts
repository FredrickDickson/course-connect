import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HomePage extends BasePage {
  readonly statEnrolledCourses = this.page.getByTestId("stat-enrolled-courses");
  readonly statCompletedCourses = this.page.getByTestId("stat-completed-courses");
  readonly statStudyHours = this.page.getByTestId("stat-study-hours");
  readonly viewAllCoursesButton = this.page.getByTestId("button-view-all-courses");
  readonly browseCoursesButton = this.page.getByTestId("button-browse-courses");
  readonly explorePropramsButton = this.page.getByTestId("button-explore-programs");
  readonly joinCommunityButton = this.page.getByTestId("button-join-community");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/");
  }

  enrollmentCard(courseId: string) {
    return this.page.getByTestId(`card-enrollment-${courseId}`);
  }

  continueLearningButton(courseId: string) {
    return this.page.getByTestId(`button-continue-${courseId}`);
  }
}
