import { test as setup } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedAll } from "./seed-test-data";
import { TEST_USERS, TEST_USER_PASSWORD } from "../fixtures/test-users";

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), ".auth");

// The root config sets fullyParallel: true, which means test() blocks in this
// file are NOT guaranteed to run in file order across workers — without this,
// "authenticate as admin" has raced ahead of "seed test data" finishing (the
// login then fails with a stale/pre-reconciliation password). Seeding must
// complete before any login attempt.
setup.describe.configure({ mode: "serial" });

setup("seed test data", async () => {
  await seedAll();
});

async function loginAndSaveState(
  page: import("@playwright/test").Page,
  email: string,
  fileName: string,
) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', TEST_USER_PASSWORD());
  await page.click('button[type="submit"]');
  // Login does a full-page redirect (window.location.href), so wait for real navigation.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
  await page.context().storageState({ path: path.join(authDir, fileName) });
}

setup("authenticate as student", async ({ page }) => {
  await loginAndSaveState(page, TEST_USERS.student.email, "student.json");
});

setup("authenticate as unenrolled student", async ({ page }) => {
  await loginAndSaveState(page, TEST_USERS.unenrolledStudent.email, "unenrolled-student.json");
});

setup("authenticate as instructor", async ({ page }) => {
  await loginAndSaveState(page, TEST_USERS.instructor.email, "instructor.json");
});

setup("authenticate as admin", async ({ page }) => {
  await loginAndSaveState(page, TEST_USERS.admin.email, "admin.json");
});
