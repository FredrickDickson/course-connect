import { test, expect } from "@playwright/test";
import { StaticContentPage } from "../../pom/marketing/StaticContentPage";

// Low-interactivity marketing/legal pages: all public, all use a real <h1>.
// One entry per route in App.tsx's public route list (07-marketing-legal
// phase of the build plan). become-instructor is lazy-loaded (React.lazy +
// Suspense) but otherwise identical in shape, so it's covered by the same
// table via BasePage.gotoAndWait's spinner wait.
const PAGES: Array<{ path: string; heading: string }> = [
  { path: "/privacy-policy", heading: "Privacy Policy" },
  { path: "/terms-of-service", heading: "Terms of Service" },
  { path: "/cookie-policy", heading: "Cookie Policy" },
  { path: "/help-center", heading: "Help Center" },
  { path: "/contact", heading: "Contact Us" },
  { path: "/technical-support", heading: "Technical Support" },
  { path: "/academic-advising", heading: "Academic Advising" },
  { path: "/global-ma-program", heading: "Global M&A Program" },
  { path: "/fcrimarb-fellowship", heading: "FCIMArb Fellowship" },
  { path: "/certification", heading: "Professional Certification" },
  { path: "/resources", heading: "Professional Resources" },
  { path: "/community-forum", heading: "Community Forum" },
  { path: "/professional-standards", heading: "Professional Standards" },
  { path: "/qualification-pathway", heading: "CIMA Qualification Pathway" },
  { path: "/become-instructor", heading: "Become a CIMA Instructor" },
];

for (const { path, heading } of PAGES) {
  test.describe(`Static page ${path}`, () => {
    test(`renders the "${heading}" heading and footer nav`, async ({ page }) => {
      const content = new StaticContentPage(page, path, heading);
      await content.goto();

      await expect(content.heading).toBeVisible();
      // Footer is shared chrome rendered on every marketing page — its
      // presence is a cheap proxy for "the page tree finished mounting
      // without throwing", not just the hero section.
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    });
  });
}
