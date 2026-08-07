import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class CertificateOfCompletionPage extends BasePage {
  readonly heading = this.page.getByRole("heading", { name: "Certificate of Completion" });
  readonly generatePreviewButton = this.page.getByRole("button", { name: /generate preview/i });
  readonly downloadButton = this.page.getByRole("button", { name: /download pdf/i });
  readonly notFoundMessage = this.page.getByText("Certificate not found.");

  constructor(page: Page) {
    super(page);
  }

  async goto(certificationId: string) {
    await this.page.goto(`/certificates/completion/${certificationId}`);
  }
}
