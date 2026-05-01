import { z } from "zod";

const qualificationLevelEnum = z.enum(["NONE", "ASSOCIATE", "MEMBER", "FELLOW"]);
const trackLevelEnum = z.enum(["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"]);
const waiverLevelEnum = z.enum(["ASSOCIATE", "MEMBER", "FELLOW"]);
const levelSourceEnum = z.enum(["DEFAULT", "EXPEDITED", "ADMIN", "MIGRATION"]);
const professionalReviewStatusEnum = z.enum([
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "MORE_INFO_REQUIRED",
]);
const professionalDocumentTypeEnum = z.enum([
  "CV",
  "CERTIFICATE",
  "LICENSE",
  "PORTFOLIO",
  "REFERENCE",
  "AWARD",
  "OTHER",
]);

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
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  profile_image_url: z.string().nullable().optional(),
  role: z.enum(["student", "instructor", "admin"]).default("student"),
  bio: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  paystack_customer_code: z.string().nullable().optional(),
  current_level: qualificationLevelEnum.default("NONE"),
  assigned_level: qualificationLevelEnum.default("NONE"),
  level_source: levelSourceEnum.nullable().optional(),
  level_updated_at: z.date().nullable().optional(),
  pathway_type: z.enum(["STANDARD", "EXPEDITED", "HYBRID"]).nullable().optional(),
  eligibility_flags: z.record(z.boolean()).default({}),
  years_adr_experience: z.number().default(0),
  years_legal_experience: z.number().default(0),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
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
  level: z.enum(["associate", "member", "fellow"]).default("associate"),
  track: z.enum(["ARBITRATION", "MEDIATION"]).default("ARBITRATION"),
  price: z.string(), // Decimal as string for precision
  currency: z.string().default("USD"),
  associatePrice: z.string().nullable().optional(),
  memberPrice: z.string().nullable().optional(),
  fellowPrice: z.string().nullable().optional(),
  requiresApproval: z.boolean().default(false),
  thumbnailUrl: z.string().nullable().optional(),
  promoVideoUrl: z.string().nullable().optional(),
  duration: z.number().nullable().optional(), // duration_hours
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  avgRating: z.string().default("0"),
  ratingCount: z.number().default(0),
  enrollmentCount: z.number().default(0),
  tags: z.array(z.string()).nullable().optional(),
  ticketTypes: z.any().nullable().optional(),
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
  contentType: z.enum(["video", "text", "quiz", "assignment"]).default("video"),
  videoUrl: z.string().nullable().optional(),
  part: z.enum(["associate", "member", "fellow"]).nullable().optional(),
  videoId: z.string().nullable().optional(),
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
  progress: z.string().default("0"),
  enrollmentType: z.enum(["COURSE", "APPLICATION", "ASSESSMENT"]).default("COURSE"),
  status: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED", "ACTIVE", "COMPLETED", "FAILED"]).default("ACTIVE"),
  enrollmentLevel: z.enum(["ASSOCIATE", "MEMBER", "FELLOW"]).nullable().optional(),
  applicationId: z.string().uuid().nullable().optional(),
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
  amount: z.string(), // decimal (legacy field - use amount_usd for new records)
  currency: z.string().default("USD"),
  status: z
    .enum(["pending", "completed", "failed", "refunded"])
    .default("pending"),
  paystackReference: z.string().nullable().optional(),
  // Currency conversion fields
  amountUsd: z.string().nullable().optional(), // Original USD amount
  amountGhs: z.string().nullable().optional(), // Charged GHS amount
  exchangeRate: z.string().nullable().optional(), // USD to GHS rate used
  originalCurrency: z.string().nullable().optional(), // Original currency (usually USD)
  chargedCurrency: z.string().nullable().optional(), // Currency actually charged (usually GHS)
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
  questionType: z
    .enum(["multiple_choice", "true_false", "fill_blank"])
    .default("multiple_choice"),
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
  currency: z.string().default("USD"),
  period: z.string().length(7), // YYYY-MM
  revenueShare: z.string().default("70.00"),
  totalRevenue: z.string(),
  status: z
    .enum(["pending", "processing", "completed", "failed"])
    .default("pending"),
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
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  reviewComments: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// MULTI-TRACK QUALIFICATION TYPES
// ============================================================================

// Track progression for a single track (Arbitration or Mediation)
export const trackProgressSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  track: z.enum(["ARBITRATION", "MEDIATION"]),
  level: trackLevelEnum.default("NONE"),
  pathway: z.enum(["STANDARD", "EXPEDITED", "HYBRID"]).nullable().optional(),
  waivedLevels: z.array(waiverLevelEnum).default([]),
  waiverMetadata: z.record(z.any()).default({}),
  waiverLastGrantedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Complete user qualification state across all tracks
export const userQualificationStateSchema = z.object({
  tracks: z.object({
    arbitration: trackProgressSchema.partial().extend({
      track: z.literal("ARBITRATION"),
    }),
    mediation: trackProgressSchema.partial().extend({
      track: z.literal("MEDIATION"),
    }),
  }),
  globalRole: z.enum(["STUDENT", "PROFESSIONAL"]).default("PROFESSIONAL"),
  completedCourses: z.array(z.string()).default([]),
  // Enhanced eligibility properties for expedited routes
  hasLegalExperience: z.boolean().default(false),
  hasLLM: z.boolean().default(false),
  hasExperience: z.boolean().default(false),
  hasBarAdmission: z.boolean().default(false),
  hasPortfolio: z.boolean().default(false),
  llmSpecialization: z.string().nullable().optional(),
  currentEmployer: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  yearsAdrExperience: z.number().default(0),
  yearsLegalExperience: z.number().default(0),
  awardWritingSamples: z.array(z.string()).default([]),
});

// Certificate with multi-dimensional metadata
export const certificateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  track: z.enum(["ARBITRATION", "MEDIATION"]),
  level: z.enum(["ASSOCIATE", "MEMBER", "FELLOW"]),
  pathway: z.enum(["STANDARD", "EXPEDITED", "HYBRID"]).nullable().optional(),
  postNominal: z.string(), // e.g., ACIMArb, MCIMArb, FCIMArb, ACIMed, MCIMed, FCIMed
  certificateNumber: z.string(),
  certificateUrl: z.string().nullable().optional(),
  issuedAt: z.date().optional(),
  validUntil: z.date().nullable().optional(),
  verificationUrl: z.string().nullable().optional(),
  isRevoked: z.boolean().default(false),
  revokedAt: z.date().nullable().optional(),
  revokedReason: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const professionalProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  track: z.enum(["ARBITRATION", "MEDIATION"]).default("ARBITRATION"),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  organization: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  yearsAdrExperience: z.number().min(0).default(0),
  yearsLegalExperience: z.number().min(0).default(0),
  practiceAreas: z.array(z.string()).default([]),
  adrRoles: z.array(z.string()).default([]),
  qualifications: z.array(z.any()).default([]),
  credentials: z.array(z.any()).default([]),
  narrativeSummary: z.string().nullable().optional(),
  selfAssessedLevel: z.enum(["ASSOCIATE", "MEMBER", "FELLOW"]).nullable().optional(),
  reviewStatus: professionalReviewStatusEnum.default("DRAFT"),
  reviewNotes: z.string().nullable().optional(),
  reviewerId: z.string().nullable().optional(),
  submittedAt: z.date().nullable().optional(),
  decisionAt: z.date().nullable().optional(),
  assignedLevel: qualificationLevelEnum.default("NONE"),
  levelSource: levelSourceEnum.default("DEFAULT"),
  assignedLevelNotes: z.string().nullable().optional(),
  submittedPayload: z.any().nullable().optional(),
  profileVersion: z.number().default(1),
  isCurrent: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const professionalDocumentSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string(),
  uploadedBy: z.string(),
  documentType: professionalDocumentTypeEnum,
  fileUrl: z.string().url(),
  originalName: z.string().nullable().optional(),
  storagePath: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]).default("PENDING"),
  visibility: z.enum(["PRIVATE", "REVIEWERS", "ADMIN", "PUBLIC"]).default("PRIVATE"),
  isPrimary: z.boolean().default(false),
  reviewerId: z.string().nullable().optional(),
  reviewNotes: z.string().nullable().optional(),
  uploadedAt: z.date().optional(),
  reviewedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const levelWaiverSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  profileId: z.string().nullable().optional(),
  track: z.enum(["ARBITRATION", "MEDIATION"]),
  level: waiverLevelEnum,
  grantedVia: z.enum(["ADMIN", "EXPEDITED", "LEGACY", "AUTOMATION"]).default("ADMIN"),
  grantedBy: z.string().nullable().optional(),
  grantedAt: z.date().optional(),
  expiresAt: z.date().nullable().optional(),
  waiverReason: z.string().nullable().optional(),
  status: z.enum(["GRANTED", "REVOKED"]).default("GRANTED"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Fellowship application (separate from expedited)
export const fellowshipApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  track: z.enum(["ARBITRATION", "MEDIATION"]),
  status: z.enum(["pending", "under_review", "approved", "rejected"]).default("pending"),
  cvUrl: z.string().nullable().optional(),
  experienceSummary: z.string().nullable().optional(),
  qualificationsSummary: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  dissertationUrl: z.string().nullable().optional(),
  dissertationTitle: z.string().nullable().optional(),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  reviewComments: z.string().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  rejectedAt: z.date().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Student membership application
export const studentMembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  institutionName: z.string(),
  studentId: z.string(),
  courseOfStudy: z.string(),
  expectedGraduationDate: z.date().nullable().optional(),
  verificationDocumentUrl: z.string().nullable().optional(),
  status: z.enum(["pending", "verified", "rejected"]).default("pending"),
  verifiedAt: z.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  submittedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Course completion record with track metadata
export const courseCompletionRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  courseId: z.string().uuid(),
  track: z.enum(["ARBITRATION", "MEDIATION"]),
  levelAchieved: z.enum(["ASSOCIATE", "MEMBER", "FELLOW"]).nullable().optional(),
  assessmentPassed: z.boolean().default(false),
  assessmentScore: z.string().nullable().optional(),
  completedAt: z.date().optional(),
  certificateId: z.string().uuid().nullable().optional(),
  isSupplementary: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Eligibility flags for each track
export const trackEligibilitySchema = z.object({
  canTakePart1: z.boolean(),
  canTakePart2: z.boolean(),
  canApplyFellow: z.boolean(),
  canUseExpedited: z.boolean(),
  canTakeAssociate: z.boolean(),
  canTakeMember: z.boolean(),
});

// Complete eligibility state
export const eligibilityStateSchema = z.object({
  arbitration: trackEligibilitySchema,
  mediation: trackEligibilitySchema,
});

// ============================================================================
// LEGACY QUALIFICATION PATHWAY SCHEMAS (for backward compatibility)
// ============================================================================

export const expeditedApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().nullable().optional(),
  track: z.enum(["ARBITRATION", "MEDIATION"]).default("ARBITRATION"),
  targetLevel: z.enum(["MEMBER", "FELLOW"]),
  status: z
    .enum([
      "draft",
      "payment_pending",
      "submitted",
      "pending",
      "under_review",
      "approved",
      "rejected",
    ])
    .default("draft"),
  cvUrl: z.string().nullable().optional(),
  experienceSummary: z.string().nullable().optional(),
  qualificationsSummary: z.string().nullable().optional(),
  paystackReference: z.string().nullable().optional(),
  paidAt: z.date().nullable().optional(),
  submittedAt: z.date().optional(),
  reviewedAt: z.date().nullable().optional(),
  reviewedBy: z.string().nullable().optional(),
  reviewComments: z.string().nullable().optional(),
  assessmentScore: z.string().nullable().optional(),
  assessmentPassed: z.boolean().nullable().optional(),
  assessmentCompletedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const applicationDocumentSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid().nullable().optional(),
  documentType: z.enum(["certificate", "degree", "transcript", "cv", "other"]),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().nullable().optional(),
  uploadedAt: z.date().optional(),
});

export const qualificationAssessmentSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid().nullable().optional(),
  assessmentType: z.enum(["member_14day", "fellow_48hour"]),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  score: z.string().nullable().optional(),
  passed: z.boolean().nullable().optional(),
  submissionContent: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// ============================================================================
// TYPES & INFERRED SCHEMAS
// ============================================================================

// Base types
export type User = z.infer<typeof userSchema>;
export type UpsertUser = Pick<User, "id" | "email"> & Partial<Omit<User, "id" | "email">>;
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
export type ExpeditedApplication = z.infer<typeof expeditedApplicationSchema>;
export type ApplicationDocument = z.infer<typeof applicationDocumentSchema>;
export type QualificationAssessment = z.infer<typeof qualificationAssessmentSchema>;
export type ProfessionalProfile = z.infer<typeof professionalProfileSchema>;
export type ProfessionalDocument = z.infer<typeof professionalDocumentSchema>;
export type LevelWaiver = z.infer<typeof levelWaiverSchema>;

// Multi-track qualification types
export type TrackProgress = z.infer<typeof trackProgressSchema>;
export type UserQualificationState = z.infer<typeof userQualificationStateSchema>;
export type Certificate = z.infer<typeof certificateSchema>;
export type FellowshipApplication = z.infer<typeof fellowshipApplicationSchema>;
export type StudentMembership = z.infer<typeof studentMembershipSchema>;
export type CourseCompletionRecord = z.infer<typeof courseCompletionRecordSchema>;
export type TrackEligibility = z.infer<typeof trackEligibilitySchema>;
export type EligibilityState = z.infer<typeof eligibilityStateSchema>;

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

export const insertAssignmentSubmissionSchema = assignmentSubmissionSchema.omit(
  {
    id: true,
    submittedAt: true,
  },
);

export const insertInstructorPayoutSchema = instructorPayoutSchema.omit({
  id: true,
  createdAt: true,
});

export const insertInstructorApplicationSchema =
  instructorApplicationSchema.omit({
    id: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertExpeditedApplicationSchema =
  expeditedApplicationSchema.omit({
    id: true,
    submittedAt: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertApplicationDocumentSchema = applicationDocumentSchema.omit({
  id: true,
  uploadedAt: true,
});

export const insertQualificationAssessmentSchema =
  qualificationAssessmentSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Insert schemas for multi-track qualification types
export const insertTrackProgressSchema = trackProgressSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCertificateSchema = certificateSchema.omit({
  id: true,
  issuedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFellowshipApplicationSchema = fellowshipApplicationSchema.omit({
  id: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentMembershipSchema = studentMembershipSchema.omit({
  id: true,
  submittedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseCompletionRecordSchema = courseCompletionRecordSchema.omit({
  id: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfessionalProfileSchema = professionalProfileSchema.omit({
  id: true,
  track: true,
  profileVersion: true,
  isCurrent: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProfessionalDocumentSchema = professionalDocumentSchema.omit({
  id: true,
  uploadedAt: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLevelWaiverSchema = levelWaiverSchema.omit({
  id: true,
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
export type InsertAssignmentSubmission = z.infer<
  typeof insertAssignmentSubmissionSchema
>;
export type InsertInstructorPayout = z.infer<
  typeof insertInstructorPayoutSchema
>;
export type InsertInstructorApplication = z.infer<
  typeof insertInstructorApplicationSchema
>;
export type InsertExpeditedApplication = z.infer<
  typeof insertExpeditedApplicationSchema
>;
export type InsertApplicationDocument = z.infer<
  typeof insertApplicationDocumentSchema
>;
export type InsertQualificationAssessment = z.infer<
  typeof insertQualificationAssessmentSchema
>;
export type InsertTrackProgress = z.infer<typeof insertTrackProgressSchema>;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type InsertFellowshipApplication = z.infer<
  typeof insertFellowshipApplicationSchema
>;
export type InsertStudentMembership = z.infer<typeof insertStudentMembershipSchema>;
export type InsertCourseCompletionRecord = z.infer<
  typeof insertCourseCompletionRecordSchema
>;
export type InsertProfessionalProfile = z.infer<typeof insertProfessionalProfileSchema>;
export type InsertProfessionalDocument = z.infer<typeof insertProfessionalDocumentSchema>;
export type InsertLevelWaiver = z.infer<typeof insertLevelWaiverSchema>;

export const insertCategorySchema = categorySchema.omit({
  id: true,
  createdAt: true,
});

export const insertModuleSchema = moduleSchema.omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = lessonSchema.omit({
  id: true,
  createdAt: true,
});

export const insertCertificationSchema = certificationSchema.omit({
  id: true,
  issuedAt: true,
});

export const insertOrderSchema = orderSchema.omit({
  id: true,
  createdAt: true,
});

// Additional missing Insert types
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

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
