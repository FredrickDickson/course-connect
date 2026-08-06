import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CourseDetailPage extends BasePage {
  readonly title = this.page.getByTestId("course-title");
  readonly subtitle = this.page.getByTestId("course-subtitle");
  readonly description = this.page.getByTestId("course-description");
  readonly enrollNowButton = this.page.getByRole("button", { name: "Enroll Now" });
  readonly continueLearningButton = this.page.getByRole("button", { name: /continue learning/i });
  readonly courseNotFoundHeading = this.page.getByRole("heading", { name: "Course Not Found" });
  readonly curriculumTab = this.page.getByRole("tab", { name: "Curriculum" });
  readonly reviewsTab = this.page.getByRole("tab", { name: "Reviews" });

  constructor(page: Page) {
    super(page);
  }

  async goto(courseId: string) {
    await this.page.goto(`/course/${courseId}`);
  }
}
