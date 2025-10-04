/**
 * Database Schema
 * 
 * Defines the complete data model for the CIMA Learning Platform using Drizzle ORM.
 * This schema is shared between frontend and backend for type safety.
 * 
 * Key Entities:
 * - Users: Authentication and profile data (integrated with Replit Auth)
 * - Courses: Course catalog with pricing and metadata
 * - Modules & Lessons: Hierarchical course content structure
 * - Enrollments: Student course registrations and progress
 * - Discussions: Community forums and Q&A
 * - Payments: Paystack integration for course purchases
 * - Quizzes & Assignments: Assessment tools for learning
 * - Certifications: Course completion certificates
 * - Instructor Analytics: Payouts and performance metrics
 * 
 * All tables use UUID primary keys except users (Replit Auth uses varchar IDs).
 * Timestamps are automatically managed with defaultNow() and updatedAt triggers.
 */

import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// AUTHENTICATION & SESSION TABLES
// Required for Replit Auth integration
// ============================================================================

/**
 * Sessions table - Stores user session data for authentication
 * Required by express-session with PostgreSQL store
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ['student', 'instructor', 'admin'] }).default('student'),
  bio: text("bio"),
  country: varchar("country"),
  timezone: varchar("timezone"),
  paystackCustomerCode: varchar("paystack_customer_code"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  description: text("description"),
  instructorId: varchar("instructor_id").references(() => users.id),
  categoryId: uuid("category_id").references(() => categories.id),
  level: varchar("level", { enum: ['beginner', 'intermediate', 'advanced'] }).default('beginner'),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('USD'),
  thumbnailUrl: varchar("thumbnail_url"),
  promoVideoUrl: varchar("promo_video_url"),
  duration: integer("duration_hours"),
  isPublished: boolean("is_published").default(false),
  isFeatured: boolean("is_featured").default(false),
  avgRating: decimal("avg_rating", { precision: 3, scale: 2 }).default('0'),
  ratingCount: integer("rating_count").default(0),
  enrollmentCount: integer("enrollment_count").default(0),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Course modules/sections
export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lessons within modules
export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: uuid("module_id").references(() => modules.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  contentType: varchar("content_type", { enum: ['video', 'text', 'quiz', 'assignment'] }).default('video'),
  videoUrl: varchar("video_url"),
  duration: integer("duration_seconds"),
  content: text("content"),
  order: integer("order").notNull(),
  isFree: boolean("is_free").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Course enrollments
export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  progress: decimal("progress", { precision: 5, scale: 2 }).default('0'),
});

// User progress on lessons
export const progress = pgTable("progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  completed: boolean("completed").default(false),
  watchTime: integer("watch_time_seconds").default(0),
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
});

// Course reviews and ratings
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discussion forums
export const discussions = pgTable("discussions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discussion replies
export const replies = pgTable("replies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  discussionId: uuid("discussion_id").references(() => discussions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  parentId: uuid("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Certifications
export const certifications = pgTable("certifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  certificateUrl: varchar("certificate_url"),
  issuedAt: timestamp("issued_at").defaultNow(),
  validUntil: timestamp("valid_until"),
});

// Payment orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('USD'),
  status: varchar("status", { enum: ['pending', 'completed', 'failed', 'refunded'] }).default('pending'),
  paystackReference: varchar("paystack_reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz tables for interactive content
export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  timeLimit: integer("time_limit_minutes"),
  passingScore: integer("passing_score").default(80),
  maxAttempts: integer("max_attempts").default(3),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  questionType: varchar("question_type", { enum: ['multiple_choice', 'true_false', 'fill_blank'] }).default('multiple_choice'),
  points: integer("points").default(1),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: uuid("question_id").references(() => quizQuestions.id, { onDelete: 'cascade' }),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: 'cascade' }),
  score: decimal("score", { precision: 5, scale: 2 }),
  totalPoints: integer("total_points"),
  passed: boolean("passed").default(false),
  timeSpent: integer("time_spent_minutes"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const quizResponses = pgTable("quiz_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  attemptId: uuid("attempt_id").references(() => quizAttempts.id, { onDelete: 'cascade' }),
  questionId: uuid("question_id").references(() => quizQuestions.id, { onDelete: 'cascade' }),
  answerId: uuid("answer_id").references(() => quizAnswers.id),
  responseText: text("response_text"),
  isCorrect: boolean("is_correct").default(false),
  pointsEarned: integer("points_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assignment tables
export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  instructions: text("instructions"),
  dueDate: timestamp("due_date"),
  maxScore: integer("max_score").default(100),
  allowLateSubmission: boolean("allow_late_submission").default(true),
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  attachmentUrls: text("attachment_urls").array(),
  score: integer("score"),
  feedback: text("feedback"),
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by").references(() => users.id),
  isLateSubmission: boolean("is_late_submission").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Instructor payout tracking
export const instructorPayouts = pgTable("instructor_payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('USD'),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM format
  revenueShare: decimal("revenue_share", { precision: 5, scale: 2 }).default('70.00'), // 70% default
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  payoutReference: varchar("payout_reference"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Course favorites
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Instructor applications
export const instructorApplications = pgTable("instructor_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  bio: text("bio").notNull(),
  experience: text("experience").notNull(),
  qualifications: text("qualifications").notNull(),
  previousTeaching: text("previous_teaching").notNull(),
  areasOfExpertise: text("areas_of_expertise").array().notNull(),
  cvUrl: varchar("cv_url"),
  videoIntroUrl: varchar("video_intro_url"),
  status: varchar("status", { enum: ['pending', 'approved', 'rejected'] }).default('pending'),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewComments: text("review_comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  progress: many(progress),
  reviews: many(reviews),
  discussions: many(discussions),
  replies: many(replies),
  certifications: many(certifications),
  orders: many(orders),
  favorites: many(favorites),
  quizAttempts: many(quizAttempts),
  assignmentSubmissions: many(assignmentSubmissions),
  instructorPayouts: many(instructorPayouts),
  instructorApplications: many(instructorApplications),
  reviewedApplications: many(instructorApplications, {
    relationName: "ApplicationReviewer",
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id],
  }),
  modules: many(modules),
  enrollments: many(enrollments),
  reviews: many(reviews),
  discussions: many(discussions),
  certifications: many(certifications),
  orders: many(orders),
  favorites: many(favorites),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  progress: many(progress),
  quizzes: many(quizzes),
  assignments: many(assignments),
}));

// Quiz relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [quizzes.lessonId],
    references: [lessons.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
  answers: many(quizAnswers),
  responses: many(quizResponses),
}));

export const quizAnswersRelations = relations(quizAnswers, ({ one, many }) => ({
  question: one(quizQuestions, {
    fields: [quizAnswers.questionId],
    references: [quizQuestions.id],
  }),
  responses: many(quizResponses),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  responses: many(quizResponses),
}));

export const quizResponsesRelations = relations(quizResponses, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [quizResponses.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(quizQuestions, {
    fields: [quizResponses.questionId],
    references: [quizQuestions.id],
  }),
  answer: one(quizAnswers, {
    fields: [quizResponses.answerId],
    references: [quizAnswers.id],
  }),
}));

// Assignment relations
export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [assignments.lessonId],
    references: [lessons.id],
  }),
  submissions: many(assignmentSubmissions),
}));

export const assignmentSubmissionsRelations = relations(assignmentSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [assignmentSubmissions.userId],
    references: [users.id],
  }),
  assignment: one(assignments, {
    fields: [assignmentSubmissions.assignmentId],
    references: [assignments.id],
  }),
  grader: one(users, {
    fields: [assignmentSubmissions.gradedBy],
    references: [users.id],
  }),
}));

// Instructor payout relations
export const instructorPayoutsRelations = relations(instructorPayouts, ({ one }) => ({
  instructor: one(users, {
    fields: [instructorPayouts.instructorId],
    references: [users.id],
  }),
}));

// Instructor application relations
export const instructorApplicationsRelations = relations(instructorApplications, ({ one }) => ({
  user: one(users, {
    fields: [instructorApplications.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [instructorApplications.reviewedBy],
    references: [users.id],
    relationName: "ApplicationReviewer",
  }),
}));

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type InsertModule = typeof modules.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = typeof enrollments.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type InsertProgress = typeof progress.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
export type Discussion = typeof discussions.$inferSelect;
export type InsertDiscussion = typeof discussions.$inferInsert;
export type Reply = typeof replies.$inferSelect;
export type InsertReply = typeof replies.$inferInsert;
export type Certification = typeof certifications.$inferSelect;
export type InsertCertification = typeof certifications.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
export type InstructorApplication = typeof instructorApplications.$inferSelect;
export type InsertInstructorApplication = typeof instructorApplications.$inferInsert;

// Quiz types
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;
export type QuizAnswer = typeof quizAnswers.$inferSelect;
export type InsertQuizAnswer = typeof quizAnswers.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;
export type QuizResponse = typeof quizResponses.$inferSelect;
export type InsertQuizResponse = typeof quizResponses.$inferInsert;

// Assignment types
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;

// Instructor payout types
export type InstructorPayout = typeof instructorPayouts.$inferSelect;
export type InsertInstructorPayout = typeof instructorPayouts.$inferInsert;

// Zod schemas for validation
export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  createdAt: true,
});

export const insertReplySchema = createInsertSchema(replies).omit({
  id: true,
  createdAt: true,
});

export const insertProgressSchema = createInsertSchema(progress).omit({
  id: true,
  lastWatchedAt: true,
});

// Quiz schemas
export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAnswerSchema = createInsertSchema(quizAnswers).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  startedAt: true,
});

export const insertQuizResponseSchema = createInsertSchema(quizResponses).omit({
  id: true,
  createdAt: true,
});

// Assignment schemas
export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions).omit({
  id: true,
  submittedAt: true,
});

// Instructor payout schema
export const insertInstructorPayoutSchema = createInsertSchema(instructorPayouts).omit({
  id: true,
  createdAt: true,
});

// Instructor application schema
export const insertInstructorApplicationSchema = createInsertSchema(instructorApplications).omit({
  id: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Add self-reference for replies after table definition
export const repliesRelations = relations(replies, ({ one, many }) => ({
  discussion: one(discussions, {
    fields: [replies.discussionId],
    references: [discussions.id],
  }),
  user: one(users, {
    fields: [replies.userId],
    references: [users.id],
  }),
  parent: one(replies, {
    fields: [replies.parentId],
    references: [replies.id],
    relationName: "ParentChild",
  }),
  children: many(replies, {
    relationName: "ParentChild",
  }),
}));

// Extended types for API responses
export type CourseWithDetails = Course & {
  instructor: User;
  category: Category;
  modules?: (Module & { lessons: Lesson[] })[];
  reviews?: (Review & { user: User })[];
  isEnrolled?: boolean;
};

// Quiz extended types
export type QuizWithQuestions = Quiz & {
  questions: (QuizQuestion & { answers: QuizAnswer[] })[];
};

export type QuizAttemptWithDetails = QuizAttempt & {
  user: User;
  quiz: Quiz;
  responses: (QuizResponse & { question: QuizQuestion; answer?: QuizAnswer })[];
};

// Assignment extended types
export type AssignmentWithSubmissions = Assignment & {
  submissions: (AssignmentSubmission & { user: User })[];
};

export type AssignmentSubmissionWithDetails = AssignmentSubmission & {
  user: User;
  assignment: Assignment;
  grader?: User;
};

export type EnrollmentWithCourse = Enrollment & {
  course: Course & { instructor: User };
};

export type DiscussionWithUser = Discussion & {
  user: User;
  _count?: { replies: number };
};

export type ReplyWithUser = Reply & {
  user: User;
};

export type ReviewWithUser = Review & {
  user: User;
};
