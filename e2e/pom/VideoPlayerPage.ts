import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * client/src/pages/video-player.tsx was completely rewritten (Udemy-style
 * layout: CourseTopBar/CourseSidebar/ContentTabs, Mux-aware video element)
 * with zero data-testids anywhere in the new component tree — every locator
 * here is derived from the actual current markup, not the old testid
 * convention. The Notes tab/feature was disabled entirely on this rewrite
 * (`{false && (...)}` in content-tabs.tsx), so there's no notes locator.
 */
export class VideoPlayerPage extends BasePage {
  // Gate states — plain <h1>s, no testid.
  readonly notEnrolled = this.page.getByRole("heading", { name: "Enroll to access this course" });
  readonly lessonNotFound = this.page.getByRole("heading", { name: "Lesson not found" });

  // "Section N · {module title}" paragraph above the lesson heading.
  readonly moduleBadge = this.page.locator("p", { hasText: /^Section \d+ ·/ });

  // Prev/Next row: `<div class="... pt-3 border-t">` with exactly two buttons.
  private readonly lessonNavRow = this.page.locator("div.pt-3.border-t");
  readonly prevLessonButton = this.lessonNavRow.locator("button").first();
  readonly nextLessonButton = this.lessonNavRow.locator("button").last();

  constructor(page: Page) {
    super(page);
  }

  async goto(courseId: string, lessonId: string) {
    await this.page.goto(`/learn/${courseId}/${lessonId}`);
  }

  /** The lesson <h2> — accessible name is the lesson's exact title. */
  lessonTitle(title: string) {
    return this.page.getByRole("heading", { level: 2, name: title, exact: true });
  }
}
