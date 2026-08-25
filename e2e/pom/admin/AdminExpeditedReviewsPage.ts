import type { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

export class AdminExpeditedReviewsPage extends BasePage {
  readonly searchInput = this.page.getByPlaceholder("Name, email, reference");

  // vaul's Drawer.Content wraps @radix-ui/react-dialog's Content, which
  // renders role="dialog" — confirmed directly against node_modules/vaul.
  readonly drawer = this.page.getByRole("dialog");
  readonly drawerReviewerNote = this.drawer.locator("textarea");

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto("/admin/expedited");
  }

  /** ProfileRow's own container is "px-6 py-5", distinct from the list header bar's "px-6 py-4". */
  reviewRow(text: string) {
    return this.page.locator("div.px-6.py-5", { hasText: text });
  }

  /** Search is debounced 400ms client-side — wait on the actual refetch instead of an arbitrary timeout. */
  async searchAndWait(term: string) {
    const responsePromise = this.page.waitForResponse(
      (r) => r.url().includes("/api/qualification/professional-profiles?") && r.status() === 200,
    );
    await this.searchInput.fill(term);
    await responsePromise;
  }

  async openReview(rowText: string) {
    await this.reviewRow(rowText).getByRole("button", { name: "Review", exact: true }).click();
  }

  /**
   * Scoped to the drawer: the row-level quick action also reads "Request
   * Info", so an unscoped getByRole would be ambiguous for that one action.
   */
  async decide(
    action: "Request Info" | "Reject" | "Assign Associate" | "Upgrade to Member" | "Upgrade to Fellow",
    note?: string,
  ) {
    if (note) await this.drawerReviewerNote.fill(note);
    await this.drawer.getByRole("button", { name: action, exact: true }).click();
  }

  async setStatusFilter(label: "All" | "Under Review" | "Needs Info" | "Approved" | "Rejected") {
    await this.page.getByText("Review Status", { exact: true }).locator("xpath=following-sibling::*[1]").click();
    await this.page.getByRole("option", { name: label, exact: true }).click();
  }
}
