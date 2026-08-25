/**
 * Canonical E2E test-user identities.
 *
 * Emails use the IANA-reserved `.test` TLD so these accounts are unambiguously
 * fake and never collide with real signups. The shared password comes from
 * E2E_TEST_USER_PASSWORD (set in .env / CI secrets) so no credential is
 * committed to the repo.
 */

function requirePassword(): string {
  const password = process.env.E2E_TEST_USER_PASSWORD;
  if (!password) {
    throw new Error(
      "E2E_TEST_USER_PASSWORD is not set. Add it to .env before running e2e seeding/tests.",
    );
  }
  return password;
}

export type TestRole = "student" | "instructor" | "admin";

export interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  role: TestRole;
  /** Level to assign on the users table for role/level-gated content checks. */
  assignedLevel: "ASSOCIATE" | "MEMBER" | "FELLOW" | null;
}

export const TEST_USERS = {
  student: {
    email: "e2e.student@cimalearn.test",
    firstName: "Erin",
    lastName: "Student",
    role: "student",
    assignedLevel: "ASSOCIATE",
  },
  unenrolledStudent: {
    email: "e2e.unenrolled@cimalearn.test",
    firstName: "Uma",
    lastName: "Unenrolled",
    role: "student",
    assignedLevel: "ASSOCIATE",
  },
  instructor: {
    email: "e2e.instructor@cimalearn.test",
    firstName: "Ian",
    lastName: "Instructor",
    role: "instructor",
    assignedLevel: null,
  },
  admin: {
    email: "e2e.admin@cimalearn.test",
    firstName: "Ada",
    lastName: "Admin",
    role: "admin",
    assignedLevel: null,
  },
  // Dedicated, non-shared fixture for the admin expedited-review decision
  // test — deliberately separate from `student` so an admin approving this
  // profile (which mutates assigned_level/track_progress/level_waivers)
  // never touches the shared student fixture other specs depend on.
  expeditedApplicant: {
    email: "e2e.expedited-applicant@cimalearn.test",
    firstName: "E2E",
    lastName: "ExpeditedApplicant",
    role: "student",
    assignedLevel: null,
  },
} as const satisfies Record<string, TestUser>;

export const TEST_USER_PASSWORD = requirePassword;

export const E2E_SEED_COURSE_TITLE = "E2E Seed Course — Do Not Delete";
export const E2E_SEED_CATEGORY_SLUG = "e2e-seed-category";
export const E2E_SEED_VALID_MEMBER_ID = "E2E-VALID-0001";
export const E2E_SEED_EXPIRED_MEMBER_ID = "E2E-EXPIRED-0001";
export const E2E_SEED_INSTRUCTOR_APPLICANT_EMAIL = "e2e.applicant@cimalearn.test";
export const E2E_SEED_FORUM_CATEGORY_SLUG = "e2e-seed-forum-category";
export const E2E_SEED_FORUM_BOARD_SLUG = "e2e-seed-forum-board";
export const E2E_SEED_FORUM_POST_SLUG = "e2e-seed-forum-post";
export const E2E_SEED_FORUM_POST_TITLE = "E2E Seed Forum Post — Do Not Delete";
