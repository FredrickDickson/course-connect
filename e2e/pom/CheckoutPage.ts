import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CheckoutPage extends BasePage {
  readonly reviewHeading = this.page.getByRole("heading", { name: "Review Your Enrollment" });
  readonly proceedToPaymentButton = this.page.getByRole("button", { name: /proceed to payment/i });
  readonly courseNotFoundHeading = this.page.getByRole("heading", { name: "Course Not Found" });

  constructor(page: Page) {
    super(page);
  }

  async goto(courseId: string) {
    await this.page.goto(`/checkout/${courseId}`);
  }
}
