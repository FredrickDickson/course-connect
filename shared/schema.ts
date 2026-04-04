import { z } from "zod";

// ============================================================================
// AUTHENTICATION & SESSION SCHEMAS
// ============================================================================

/**
 * Sessions schema - (Legacy)
 */
export const sessionSchema = z.object({
  sid: z.string(),
  sess: z.any(),
  expire: z.date(),
});

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  password: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  role: z.enum(['student', 'instructor', 'admin']).default('student'),
  bio: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  paystackCustomerCode: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Category schema
export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  slug: z.string().min(1),
  createdAt: z.date().optional(),
});

// Course schema
export const courseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  instructorId: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  price: z.string(), // Decimal as string for precision
  currency: z.string().default('USD'),
  thumbnailUrl: z.string().nullable().optional(),
  promoVideoUrl: z.string().nullable().optional(),
  duration: z.number().nullable().optional(), // duration_hours
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  avgRating: z.string().default('0'),
  ratingCount: z.number().default(0),
  enrollmentCount: z.number().default(0),
  tags: z.array(z.string()).nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Module schema
export const moduleSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  order: z.number(),
  createdAt: z.date().optional(),
});

// Lesson schema
export const lessonSchema = z.object({
  id: z.string().uuid(),
  moduleId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  contentType: z.enum(['video', 'text', 'quiz', 'assignment']).default('video'),
  videoUrl: z.string().nullable().optional(),
  duration: z.number().nullable().optional(), // duration_seconds
  content: z.string().nullable().optional(),
  order: z.number(),
  isFree: z.boolean().default(false),
  createdAt: z.date().optional(),
});

// Enrollment schema
export const enrollmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  enrolledAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  progress: z.string().default('0'),
});

// Progress schema
export const progressSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  lessonId: z.string().uuid().nullable().optional(),
  completed: z.boolean().default(false),
  watchTime: z.number().default(0), // watch_time_seconds
  lastWatchedAt: z.date().optional(),
});

// Review schema
export const reviewSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  rating: z.number(),
  comment: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

// Discussion schema
export const discussionSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid().nullable().optional(),
  userId: z.string().nullable().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.date().optional(),
});

// Reply schema
export const replySchema = z.object({
  id: z.string().uuid(),
  discussionId: z.string().uuid().nullable().optional(),
  userId: z.string().nullable().optional(),
  content: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
  createdAt: z.date().optional(),
});

// Certification schema
export const certificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  certificateUrl: z.string().nullable().optional(),
  issuedAt: z.date().optional(),
  validUntil: z.date().nullable().optional(),
});

// Order schema
export const orderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  amount: z.string(), // decimal
  currency: z.string().default('USD'),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('pending'),
  paystackReference: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

// Quiz schemas
export const quizSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  timeLimit: z.number().nullable().optional(), // time_limit_minutes
  passingScore: z.number().default(80),
  maxAttempts: z.number().default(3),
  isRequired: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export const quizQuestionSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid().nullable().optional(),
  question: z.string().min(1),
  questionType: z.enum(['multiple_choice', 'true_false', 'fill_blank']).default('multiple_choice'),
  points: z.number().default(1),
  order: z.number(),
  createdAt: z.date().optional(),
});

export const quizAnswerSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid().nullable().optional(),
  answer: z.string().min(1),
  isCorrect: z.boolean().default(false),
  order: z.number(),
  createdAt: z.date().optional(),
});

export const quizAttemptSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  quizId: z.string().uuid().nullable().optional(),
  score: z.string().nullable().optional(), // decimal
  totalPoints: z.number().nullable().optional(),
  passed: z.boolean().default(false),
  timeSpent: z.number().nullable().optional(), // time_spent_minutes
  startedAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
});

export const quizResponseSchema = z.object({
  id: z.string().uuid(),
  attemptId: z.string().uuid().nullable().optional(),
  questionId: z.string().uuid().nullable().optional(),
  answerId: z.string().uuid().nullable().optional(),
  responseText: z.string().nullable().optional(),
  isCorrect: z.boolean().default(false),
  pointsEarned: z.number().default(0),
  createdAt: z.date().optional(),
});

// Course resource schema
export const courseResourceSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid().nullable().optional(),
  courseId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  downloadCount: z.number().default(0),
  createdAt: z.date().optional(),
});

// Assignment schemas
export const assignmentSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  instructions: z.string().nullable().optional(),
  dueDate: z.date().nullable().optional(),
  maxScore: z.number().default(100),
  allowLateSubmission: z.boolean().default(true),
  isRequired: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export const assignmentSubmissionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  assignmentId: z.string().uuid().nullable().optional(),
  content: z.string().min(1),
  attachmentUrls: z.array(z.string()).nullable().optional(),
  score: z.number().nullable().optional(),
  feedback: z.string().nullable().optional(),
  gradedAt: z.date().nullable().optional(),
  gradedBy: z.string().nullable().optional(),
  isLateSubmission: z.boolean().default(false),
  submittedAt: z.date().optional(),
});

// Instructor payout tracking
export const instructorPayoutSchema = z.object({
  id: z.string().uuid(),
  instructorId: z.string().nullable().optional(),
  amount: z.string(), // decimal
  currency: z.string().default('USD'),
  period: z.string().length(7), // YYYY-MM
  revenueShare: z.string().default('70.00'),
  totalRevenue: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  payoutReference: z.string().nullable().optional(),
  processedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
});

// Instructor applications
export const instructorApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  bio: z.string().min(1),
  experience: z.string().min(1),
  qualifications: z.string().min(1),
  previousTeaching: z.string().min(1),
  areasOfExpertise: z.array(z.string()).min(1),
  cvUrl: z.string().nullable().optional(),
  videoIntroUrl: z.string().nullable().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  reviewComments: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// TYPES & INFERRED SCHEMAS
// ============================================================================

// Base types
export type User = z.infer<typeof userSchema>;
export type UpsertUser = z.infer<typeof userSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type Discussion = z.infer<typeof discussionSchema>;
export type Reply = z.infer<typeof replySchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CourseResource = z.infer<typeof courseResourceSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export type QuizResponse = z.infer<typeof quizResponseSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type AssignmentSubmission = z.infer<typeof assignmentSubmissionSchema>;
export type InstructorPayout = z.infer<typeof instructorPayoutSchema>;
export type InstructorApplication = z.infer<typeof instructorApplicationSchema>;

// Insert schemas (omitting generated fields)
export const insertCourseSchema = courseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEnrollmentSchema = enrollmentSchema.omit({
  id: true,
  enrolledAt: true,
});

export const insertReviewSchema = reviewSchema.omit({
  id: true,
  createdAt: true,
});

export const insertDiscussionSchema = discussionSchema.omit({
  id: true,
  createdAt: true,
});

export const insertReplySchema = replySchema.omit({
  id: true,
  createdAt: true,
});

export const insertProgressSchema = progressSchema.omit({
  id: true,
  lastWatchedAt: true,
});

export const insertQuizSchema = quizSchema.omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = quizQuestionSchema.omit({
  id: true,
  createdAt: true,
});

export const insertQuizAnswerSchema = quizAnswerSchema.omit({
  id: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = quizAttemptSchema.omit({
  id: true,
  startedAt: true,
});

export const insertQuizResponseSchema = quizResponseSchema.omit({
  id: true,
  createdAt: true,
});

export const insertCourseResourceSchema = courseResourceSchema.omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = assignmentSchema.omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSubmissionSchema = assignmentSubmissionSchema.omit({
  id: true,
  submittedAt: true,
});

export const insertInstructorPayoutSchema = instructorPayoutSchema.omit({
  id: true,
  createdAt: true,
});

export const insertInstructorApplicationSchema = instructorApplicationSchema.omit({
  id: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type InsertReply = z.infer<typeof insertReplySchema>;
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type InsertQuizAnswer = z.infer<typeof insertQuizAnswerSchema>;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type InsertQuizResponse = z.infer<typeof insertQuizResponseSchema>;
export type InsertCourseResource = z.infer<typeof insertCourseResourceSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type InsertInstructorPayout = z.infer<typeof insertInstructorPayoutSchema>;
export type InsertInstructorApplication = z.infer<typeof insertInstructorApplicationSchema>;

// Additional missing Insert types
export type InsertCategory = z.infer<typeof categorySchema>;
export type InsertModule = z.infer<typeof moduleSchema>;
export type InsertLesson = z.infer<typeof lessonSchema>;
export type InsertCertification = z.infer<typeof certificationSchema>;
export type InsertOrder = z.infer<typeof orderSchema>;

// Extended types for API responses
export type CourseWithDetails = Course & {
  instructor: User;
  category: Category;
  modules?: (Module & { lessons: Lesson[] })[];
  reviews?: (Review & { user: User })[];
  isEnrolled?: boolean;
};

export type QuizWithQuestions = Quiz & {
  questions: (QuizQuestion & { answers: QuizAnswer[] })[];
};

export type QuizAttemptWithDetails = QuizAttempt & {
  user: User;
  quiz: Quiz;
  responses: (QuizResponse & { question: QuizQuestion; answer?: QuizAnswer })[];
};

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
  replyCount?: number;
};

export type ReplyWithUser = Reply & {
  user: User;
};

export type ReviewWithUser = Review & {
  user: User;
};
