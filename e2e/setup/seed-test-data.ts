/**
 * Idempotent E2E test-data seeding.
 *
 * Safe to run repeatedly against the shared dev Supabase project: every write
 * is a find-or-create against a stable natural key (email, a fixed seed
 * title/slug, or a foreign-key pair), never a blind insert and never a
 * destructive delete. Run standalone via `npm run test:e2e:seed`, or
 * imported by e2e/setup/global.setup.ts before storageState capture.
 */

import { pathToFileURL } from "node:url";
import { supabaseAdmin } from "../fixtures/db";
import {
  TEST_USERS,
  TEST_USER_PASSWORD,
  E2E_SEED_COURSE_TITLE,
  E2E_SEED_CATEGORY_SLUG,
  E2E_SEED_VALID_MEMBER_ID,
  E2E_SEED_EXPIRED_MEMBER_ID,
  E2E_SEED_INSTRUCTOR_APPLICANT_EMAIL,
  E2E_SEED_FORUM_CATEGORY_SLUG,
  E2E_SEED_FORUM_BOARD_SLUG,
  E2E_SEED_FORUM_POST_SLUG,
  E2E_SEED_FORUM_POST_TITLE,
  type TestUser,
} from "../fixtures/test-users";

async function findAuthUserByEmail(email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) break;
  }
  return null;
}

async function findOrCreateAuthUser(user: TestUser) {
  const existing = await findAuthUserByEmail(user.email);
  if (existing) {
    // Reconcile password/metadata on every run rather than leaving it as
    // whatever it was at first creation — these are exclusively
    // E2E-managed `.test` fixture accounts, so "matches current
    // E2E_TEST_USER_PASSWORD" is the actual idempotency invariant we want
    // (self-heals drift, e.g. from a manually rotated password).
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: TEST_USER_PASSWORD(),
      email_confirm: true,
      user_metadata: {
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
      },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: TEST_USER_PASSWORD(),
    email_confirm: true,
    user_metadata: {
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    },
  });
  if (error) throw error;
  return data.user;
}

async function upsertUserRow(authUserId: string, user: TestUser) {
  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: authUserId,
        email: user.email.toLowerCase(),
        first_name: user.firstName,
        last_name: user.lastName,
        role: user.role,
        assigned_level: user.assignedLevel,
        current_level: user.assignedLevel,
      },
      { onConflict: "id" },
    );
  if (error) throw error;
}

async function upsertProfile(authUserId: string, user: TestUser) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (selectError) throw selectError;

  const payload = {
    user_id: authUserId,
    full_name: `${user.firstName} ${user.lastName}`,
    profile_completed: true,
    bio_data_completed: true,
    status: user.role,
    country: "Ghana",
    timezone: "Africa/Accra",
  };

  if (existing) {
    const { error } = await supabaseAdmin.from("profiles").update(payload).eq("user_id", authUserId);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from("profiles").insert(payload);
    if (error) throw error;
  }
}

async function seedUser(user: TestUser) {
  const authUser = await findOrCreateAuthUser(user);
  await upsertUserRow(authUser.id, user);
  await upsertProfile(authUser.id, user);
  return authUser.id;
}

async function findOrCreateCategory(): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("slug", E2E_SEED_CATEGORY_SLUG)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({ name: "E2E Seed Category", slug: E2E_SEED_CATEGORY_SLUG })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateCourse(instructorId: string, categoryId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("title", E2E_SEED_COURSE_TITLE)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert({
      title: E2E_SEED_COURSE_TITLE,
      subtitle: "Seeded fixture course for Playwright E2E tests",
      description: "Do not delete — used by the e2e test suite as a stable enrollment/lesson/quiz target.",
      category_id: categoryId,
      instructor_id: instructorId,
      programme_type: "PROFESSIONAL_PROGRAMME",
      level: "associate",
      track: "ARBITRATION",
      price: 0,
      currency: "GHS",
      is_published: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateModule(courseId: string): Promise<string> {
  // Note: "order" is a PostgREST-reserved query param name, so it can't be used
  // as an .eq() filter column (it gets parsed as the sort-order modifier
  // instead). Filter by title, not just course_id: a 04-instructor spec adds
  // extra sections to this same fixture course (creating real, deliberately
  // non-cleaned-up rows to verify persistence), so course_id alone is no
  // longer guaranteed to match exactly one row.
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .eq("title", "Module 1: Introduction")
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert({ course_id: courseId, title: "Module 1: Introduction", order: 1 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateLesson(moduleId: string, order: number, title: string): Promise<string> {
  // "order" can't be used as an .eq() filter column (PostgREST-reserved query
  // param name) — look up by title instead, which is unique per seeded lesson.
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("lessons")
    .select("id")
    .eq("module_id", moduleId)
    .eq("title", title)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("lessons")
    .insert({
      module_id: moduleId,
      title,
      order,
      content_type: "text",
      content: "Seeded lesson content for E2E tests.",
      is_preview: order === 1,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateQuiz(lessonId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .insert({
      lesson_id: lessonId,
      title: "E2E Seed Quiz",
      passing_score: 50,
      is_required: true,
      // High ceiling: quiz_attempts rows accumulate permanently across every
      // E2E run (never cleaned up), so a low/default max_attempts would
      // eventually make this fixture quiz permanently "exceeded" for the
      // seeded student.
      max_attempts: 100000,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateQuizQuestion(quizId: string): Promise<string> {
  // "order" can't be used as an .eq() filter column (PostgREST-reserved query
  // param name) — quiz_id alone is a stable key since this seed only ever
  // creates one question per fixture quiz.
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("quiz_questions")
    .select("id")
    .eq("quiz_id", quizId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("quiz_questions")
    .insert({
      quiz_id: quizId,
      question: "What is 2 + 2?",
      question_type: "multiple_choice",
      order: 1,
      points: 1,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function seedQuizAnswers(questionId: string) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("quiz_answers")
    .select("id")
    .eq("question_id", questionId);
  if (selectError) throw selectError;
  if (existing && existing.length > 0) return;

  const { error } = await supabaseAdmin.from("quiz_answers").insert([
    { question_id: questionId, answer: "3", is_correct: false, order: 1 },
    { question_id: questionId, answer: "4", is_correct: true, order: 2 },
    { question_id: questionId, answer: "5", is_correct: false, order: 3 },
  ]);
  if (error) throw error;
}

async function findOrCreateEnrollment(userId: string, courseId: string) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      status: "ACTIVE",
      enrollment_level: "ASSOCIATE",
      enrollment_type: "COURSE",
      progress: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateMember(opts: {
  memberId: string;
  fullName: string;
  email: string;
  part: "associate" | "member" | "fellow";
  status: "pending" | "active" | "expiring" | "expired";
  expiryDate: string;
}) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("member_id", opts.memberId)
    .maybeSingle();
  if (selectError) throw selectError;

  const payload = {
    member_id: opts.memberId,
    full_name: opts.fullName,
    email: opts.email,
    part: opts.part,
    status: opts.status,
    issue_date: "2020-01-01",
    expiry_date: opts.expiryDate,
  };

  if (existing) {
    const { error } = await supabaseAdmin.from("members").update(payload).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.from("members").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

/**
 * NOTE: course completion never actually creates a certification row via the
 * real product flow — video-player.tsx writes lesson progress directly to
 * Supabase, bypassing the only server route (POST /api/enrollments/progress)
 * that contains the "all lessons done -> create certification" logic. That
 * logic is unreachable dead code today (tracked as a product bug, not fixed
 * here per user decision). This seeds a certification row directly so the
 * certificate-of-completion PAGE itself is testable independent of that gap.
 */
async function findOrCreateCertification(userId: string, courseId: string) {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("certifications")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("certifications")
    .insert({ user_id: userId, course_id: courseId, certificate_url: null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreatePendingInstructorApplication() {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("instructor_applications")
    .select("id")
    .eq("email", E2E_SEED_INSTRUCTOR_APPLICANT_EMAIL)
    .eq("status", "pending")
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("instructor_applications")
    .insert({
      first_name: "E2E",
      last_name: "Applicant",
      email: E2E_SEED_INSTRUCTOR_APPLICANT_EMAIL,
      phone: "0244000000",
      bio: "Seeded instructor applicant for the E2E test suite.",
      experience: "10 years of ADR practice.",
      qualifications: "LLB, LLM in International Arbitration.",
      previous_teaching: "Guest lecturer at two law schools.",
      areas_of_expertise: ["Arbitration", "Mediation"],
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Provisions the `expeditedApplicant` fixture user's professional_profiles
 * row (+ one CV document) in a known UNDER_REVIEW state, and resets every
 * table the admin decision test's own action mutates (users level fields,
 * track_progress, level_waivers) back to baseline. Unlike the rest of this
 * file, this is a reset-on-every-run, not a pure find-or-create — the
 * fixture's whole purpose is to be approved by the admin spec, so it must be
 * put back before each run rather than left in whatever state the last run
 * left it in.
 */
async function resetExpeditedApplicantFixture(userId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("professional_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();
  if (selectError) throw selectError;

  const profilePayload = {
    user_id: userId,
    track: "ARBITRATION",
    self_assessed_level: "MEMBER",
    narrative_summary: "Seeded E2E applicant: 8 years of arbitration and mediation practice.",
    qualifications: ["LLB", "Called to the Bar 2016"],
    review_status: "UNDER_REVIEW",
    assigned_level: "NONE",
    level_source: "DEFAULT",
    assigned_level_notes: null,
    reviewer_id: null,
    review_notes: null,
    decision_at: null,
    submitted_at: new Date().toISOString(),
    is_current: true,
    is_archived: false,
  };

  let profileId: string;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("professional_profiles")
      .update(profilePayload)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Failed to reset expedited applicant profile");
    profileId = data.id;
  } else {
    const { data, error } = await supabaseAdmin
      .from("professional_profiles")
      .insert(profilePayload)
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Failed to seed expedited applicant profile");
    profileId = data.id;
  }

  const { data: existingDoc, error: docSelectError } = await supabaseAdmin
    .from("professional_documents")
    .select("id")
    .eq("profile_id", profileId)
    .eq("document_type", "CV")
    .maybeSingle();
  if (docSelectError) throw docSelectError;
  if (!existingDoc) {
    const { error } = await supabaseAdmin.from("professional_documents").insert({
      profile_id: profileId,
      uploaded_by: userId,
      document_type: "CV",
      file_url: `${userId}/seed-cv.pdf`,
      storage_path: `${userId}/seed-cv.pdf`,
      original_name: "seed-cv.pdf",
    });
    if (error) throw error;
  }

  const { error: userResetError } = await supabaseAdmin
    .from("users")
    .update({
      assigned_level: null,
      current_level: null,
      level_source: "DEFAULT",
      pathway_type: null,
      level_updated_at: null,
    })
    .eq("id", userId);
  if (userResetError) throw userResetError;

  const { error: trackResetError } = await supabaseAdmin.from("track_progress").upsert(
    {
      user_id: userId,
      track: "ARBITRATION",
      level: "NONE",
      pathway: "STANDARD",
      waived_levels: [],
      waiver_metadata: {},
      waiver_last_granted_at: null,
    },
    { onConflict: "user_id,track" },
  );
  if (trackResetError) throw trackResetError;

  // Fixture-owned exception to this file's "never destructive delete" idiom:
  // these level_waivers rows are only ever created by this same fixture's own
  // admin-decision test, scoped precisely to this dedicated user_id, so
  // clearing them here is safe — and necessary to keep that test idempotent
  // across repeated runs.
  const { error: waiverDeleteError } = await supabaseAdmin.from("level_waivers").delete().eq("user_id", userId);
  if (waiverDeleteError) throw waiverDeleteError;

  return profileId;
}

async function findOrCreateForumCategory(): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("forum_categories")
    .select("id")
    .eq("slug", E2E_SEED_FORUM_CATEGORY_SLUG)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("forum_categories")
    .insert({
      name: "E2E Seed Forum Category",
      slug: E2E_SEED_FORUM_CATEGORY_SLUG,
      description: "Seeded forum category for the E2E test suite.",
      is_active: true,
      display_order: 999,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateForumBoard(categoryId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("forum_boards")
    .select("id")
    .eq("slug", E2E_SEED_FORUM_BOARD_SLUG)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("forum_boards")
    .insert({
      category_id: categoryId,
      name: "E2E Seed Forum Board",
      slug: E2E_SEED_FORUM_BOARD_SLUG,
      description: "Seeded forum board for the E2E test suite.",
      is_active: true,
      is_course_board: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateForumPost(boardId: string, authorUserId: string): Promise<string> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("forum_posts")
    .select("id")
    .eq("slug", E2E_SEED_FORUM_POST_SLUG)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  // forum_posts.author_id -> profiles.id, a separate PK from the auth user id.
  const { data: authorProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("user_id", authorUserId)
    .single();
  if (profileError) throw profileError;

  const { data, error } = await supabaseAdmin
    .from("forum_posts")
    .insert({
      board_id: boardId,
      author_id: authorProfile.id,
      title: E2E_SEED_FORUM_POST_TITLE,
      body: "Seeded forum post body for the E2E test suite.",
      slug: E2E_SEED_FORUM_POST_SLUG,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function seedAll() {
  console.log("[e2e-seed] Seeding auth users + profiles...");
  const studentId = await seedUser(TEST_USERS.student);
  const unenrolledStudentId = await seedUser(TEST_USERS.unenrolledStudent);
  const instructorId = await seedUser(TEST_USERS.instructor);
  const adminId = await seedUser(TEST_USERS.admin);
  const expeditedApplicantId = await seedUser(TEST_USERS.expeditedApplicant);

  console.log("[e2e-seed] Resetting expedited-applicant review fixture...");
  await resetExpeditedApplicantFixture(expeditedApplicantId);

  console.log("[e2e-seed] Seeding category + course + curriculum...");
  const categoryId = await findOrCreateCategory();
  const courseId = await findOrCreateCourse(instructorId, categoryId);
  const moduleId = await findOrCreateModule(courseId);
  const lesson1Id = await findOrCreateLesson(moduleId, 1, "Lesson 1: Getting Started");
  await findOrCreateLesson(moduleId, 2, "Lesson 2: Core Concepts");

  console.log("[e2e-seed] Seeding quiz...");
  const quizId = await findOrCreateQuiz(lesson1Id);
  const questionId = await findOrCreateQuizQuestion(quizId);
  await seedQuizAnswers(questionId);

  console.log("[e2e-seed] Seeding student enrollment (bypassing Paystack)...");
  await findOrCreateEnrollment(studentId, courseId);
  // unenrolledStudentId deliberately gets no enrollment — negative-case fixture.

  console.log("[e2e-seed] Seeding certification (bypassing the broken completion flow)...");
  await findOrCreateCertification(studentId, courseId);

  console.log("[e2e-seed] Seeding member verification fixtures...");
  await findOrCreateMember({
    memberId: E2E_SEED_VALID_MEMBER_ID,
    fullName: "E2E Valid Member",
    email: "e2e.valid-member@cimalearn.test",
    part: "associate",
    status: "active",
    expiryDate: "2099-12-31",
  });
  await findOrCreateMember({
    memberId: E2E_SEED_EXPIRED_MEMBER_ID,
    fullName: "E2E Expired Member",
    email: "e2e.expired-member@cimalearn.test",
    part: "member",
    status: "expired",
    expiryDate: "2020-01-01",
  });

  console.log("[e2e-seed] Seeding pending instructor application...");
  await findOrCreatePendingInstructorApplication();

  console.log("[e2e-seed] Seeding forum category + board + post...");
  const forumCategoryId = await findOrCreateForumCategory();
  const forumBoardId = await findOrCreateForumBoard(forumCategoryId);
  await findOrCreateForumPost(forumBoardId, studentId);

  console.log("[e2e-seed] Done.");
  return {
    studentId,
    unenrolledStudentId,
    instructorId,
    adminId,
    expeditedApplicantId,
    courseId,
    forumCategoryId,
    forumBoardId,
  };
}

// Allow `tsx e2e/setup/seed-test-data.ts` to run this standalone (ESM entrypoint check).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  seedAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[e2e-seed] Failed:", err);
      process.exit(1);
    });
}
