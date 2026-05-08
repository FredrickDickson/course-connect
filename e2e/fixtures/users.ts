import { Page } from "@playwright/test";

export const TEST_USERS = {
  student: { email: "student@cima-test.dev", password: "StudentPass123!", role: "student" },
  instructor: { email: "instructor@cima-test.dev", password: "InstructorPass123!", role: "instructor" },
  admin: { email: "admin@cima-test.dev", password: "AdminPass123!", role: "admin" },
  applicant: { email: "applicant@cima-test.dev", password: "ApplicantPass123!", role: "student" },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

export async function login(page: Page, key: TestUserKey) {
  const u = TEST_USERS[key];
  await page.goto("/login");
  await page.fill('input[type="email"], [name="email"]', u.email);
  await page.fill('input[type="password"], [name="password"]', u.password);
  await Promise.all([
    page.waitForURL(/\/(dashboard|home|onboarding|admin|instructor)/, { timeout: 15_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
}