import type { Page } from "@playwright/test";

export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Waits out the React.lazy Suspense fallback (a bare `.animate-spin` div,
   * no testid) used for role-gated routes (instructor/admin dashboards,
   * create-course, curriculum, admin-setup, become-instructor). A bare
   * goto()+assert on these pages flakes without this.
   */
  async waitForLazyPageReady() {
    const spinner = this.page.locator(".animate-spin");
    await spinner.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {
      // No spinner ever appeared — page wasn't lazy-loaded this time, fine.
    });
  }

  async gotoAndWait(path: string) {
    await this.page.goto(path);
    await this.waitForLazyPageReady();
  }
}
