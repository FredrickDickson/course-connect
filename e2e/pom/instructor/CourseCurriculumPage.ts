import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class CourseCurriculumPage extends BasePage {
  readonly addSectionButton = this.page.getByRole("button", { name: "Add Section" });
  readonly sectionTitleInput = this.page.locator("#module-title");
  readonly sectionDescInput = this.page.locator("#module-desc");

  constructor(page: Page) {
    super(page);
  }

  async goto(courseId: string) {
    await this.gotoAndWait(`/instructor/courses/${courseId}/curriculum`);
  }

  moduleHeader(title: string) {
    return this.page.getByText(title, { exact: true });
  }

  /** The module's <h3> title has no click handler — the expand/collapse
   * toggle is the icon-only chevron Button (class "p-0 h-auto" in source).
   * Not .first() / .getByRole("button"): @dnd-kit's useSortable() spreads
   * `attributes` (including role="button") onto the preceding drag-handle
   * div, so it registers as a "button" too and sorts before the real
   * chevron — clicking it fires a drag interaction instead of a toggle. */
  async expandModule(title: string) {
    const card = this.page.locator(".border-l-4").filter({ hasText: title });
    await card.locator("button.p-0.h-auto").click();
  }
}
