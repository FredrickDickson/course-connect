import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const authDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "setup", ".auth");

// Parameter-less protected routes only — param'd routes (/checkout/:id,
// /learn/:courseId/:lessonId, /quiz/:quizId, /enroll/:courseId/status)
// need a real seeded course id and are covered in 03-student-journey instead.
const PROTECTED_ROUTES = ["/dashboard", "/profile", "/courses", "/programs", "/onboarding", "/renew-membership", "/community", "/expedited-application"];
const INSTRUCTOR_ONLY_ROUTES = ["/instructor"];
const ADMIN_ONLY_ROUTES = ["/admin", "/admin-setup"];

test.describe("Route guards — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of [...PROTECTED_ROUTES, ...INSTRUCTOR_ONLY_ROUTES, ...ADMIN_ONLY_ROUTES]) {
    test(`${route} redirects an unauthenticated visitor to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("Route guards — student role", () => {
  test.use({ storageState: path.join(authDir, "student.json") });

  for (const route of INSTRUCTOR_ONLY_ROUTES) {
    test(`${route} redirects a student away`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("/", { timeout: 10_000 });
    });
  }

  for (const route of ADMIN_ONLY_ROUTES) {
    test(`${route} redirects a student away`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("/", { timeout: 10_000 });
    });
  }

  test("a plain protected route (no role requirement) is reachable", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("Route guards — instructor role", () => {
  test.use({ storageState: path.join(authDir, "instructor.json") });

  for (const route of ADMIN_ONLY_ROUTES) {
    test(`${route} redirects an instructor away`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL("/", { timeout: 10_000 });
    });
  }

  test("/instructor is reachable", async ({ page }) => {
    await page.goto("/instructor");
    await expect(page).toHaveURL(/\/instructor/);
  });
});

test.describe("Route guards — admin role", () => {
  test.use({ storageState: path.join(authDir, "admin.json") });

  test("admin bypasses the instructor-only guard and can reach /instructor", async ({ page }) => {
    await page.goto("/instructor");
    await expect(page).toHaveURL(/\/instructor/);
  });

  test("/admin is reachable", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
  });

  test("/admin-setup is reachable", async ({ page }) => {
    await page.goto("/admin-setup");
    await expect(page).toHaveURL(/\/admin-setup/);
  });
});
