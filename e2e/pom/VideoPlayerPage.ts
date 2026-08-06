import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class VideoPlayerPage extends BasePage {
  readonly notEnrolled = this.page.getByTestId("not-enrolled");
  readonly enrollButton = this.page.getByTestId("enroll-button");
  readonly lessonNotFound = this.page.getByTestId("lesson-not-found");
  readonly lessonTitle = this.page.getByTestId("lesson-title");
  readonly lessonDescription = this.page.getByTestId("lesson-description");
  readonly moduleBadge = this.page.getByTestId("module-badge");
  readonly nextLessonButton = this.page.getByTestId("next-lesson");
  readonly prevLessonButton = this.page.getByTestId("prev-lesson");
  readonly courseCompleteButton = this.page.getByTestId("course-complete");
  readonly backToCourseButton = this.page.getByTestId("back-to-course");
  readonly notesTab = this.page.getByRole("tab", { name: "Notes" });
  readonly notesTextarea = this.page.getByTestId("notes-textarea");
  readonly saveNotesButton = this.page.getByTestId("save-notes");

  constructor(page: Page) {
    super(page);
  }

  async goto(courseId: string, lessonId: string) {
    await this.page.goto(`/learn/${courseId}/${lessonId}`);
  }

  lessonNavLink(lessonId: string) {
    return this.page.getByTestId(`lesson-nav-${lessonId}`);
  }
}
