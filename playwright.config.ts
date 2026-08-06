import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const baseURL = "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Capped low: the app runs as a single-process dev server (nodemon+vite,
  // not clustered) against one shared, non-dedicated Supabase project.
  // Running the full suite at higher concurrency (verified up to 4 workers)
  // produces load-related flakiness (slow/queued Supabase queries causing
  // real page-load timeouts) even though every phase passes cleanly on its
  // own - this is resource contention, not a test or app bug.
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 30_000,

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
  },

  projects: [
    {
      name: "setup",
      testDir: "./e2e/setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      // Unauthenticated by default: landing, marketing/legal pages, auth
      // flows. route-guards.spec.ts within 01-auth opts into role-specific
      // storageState per-describe-block, which requires the seeded data and
      // captured auth states from the `setup` project to exist first.
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [
        /00-infra\//,
        /01-auth\//,
        /02-public-content\//,
        /07-marketing-legal\//,
      ],
      // home.spec.ts covers the authenticated "/" view (Home, not Landing) —
      // needs student storageState, so chromium-student handles it instead.
      testIgnore: /02-public-content\/home\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "chromium-student",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/setup/.auth/student.json" },
      testMatch: [/03-student-journey\//, /06-community\//, /02-public-content\/home\.spec\.ts/],
      dependencies: ["setup"],
    },
    {
      name: "chromium-instructor",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/setup/.auth/instructor.json" },
      testMatch: /04-instructor\//,
      dependencies: ["setup"],
    },
    {
      name: "chromium-admin",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/setup/.auth/admin.json" },
      testMatch: /05-admin\//,
      dependencies: ["setup"],
    },
  ],
});
