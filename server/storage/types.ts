/**
 * Storage Types
 * 
 * Defines the IStorage interface and all types used by the storage layer.
 */

import type {
  User,
  UpsertUser,
  Course,
  InsertCourse,
  Module,
  InsertModule,
  Lesson,
  InsertLesson,
  Enrollment,
  InsertEnrollment,
  Progress,
  InsertProgress,
  Review,
  InsertReview,
  Discussion,
  InsertDiscussion,
  Reply,
  InsertReply,
  Certification,
  InsertCertification,
  Order,
  InsertOrder,
  Category,
  InsertCategory,
  CourseResource,
  InsertCourseResource,
  Quiz,
  InsertQuiz,
  QuizQuestion,
  InsertQuizQuestion,
  QuizAnswer,
  InsertQuizAnswer,
  QuizAttempt,
  InsertQuizAttempt,
  QuizResponse,
  InsertQuizResponse,
  Assignment,
  InsertAssignment,
  AssignmentSubmission,
  InsertAssignmentSubmission,
  InstructorPayout,
  InsertInstructorPayout,
  InstructorApplication,
  InsertInstructorApplication,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  updateUserPaystackInfo(id: string, customerCode: string): Promise<User>;
  updateUserRole(id: string, role: "student" | "instructor" | "admin"): Promise<User>;
  getInstructors(): Promise<User[]>;
  getUsers(filters?: { page?: number; limit?: number; search?: string; role?: string }): Promise<User[]>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Course operations
  getCourses(filters?: { category?: string; search?: string; level?: string; featured?: boolean }): Promise<any[]>;
  getCourseById(id: string): Promise<any>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getFeaturedCourses(): Promise<any[]>;
  getInstructorCourses(instructorId: string): Promise<any[]>;
  getInstructorStats(instructorId: string): Promise<{ totalCourses: number; totalStudents: number; totalRevenue: number; averageRating: number }>;
  getCoursesForAdmin(filters?: { page?: number; limit?: number; status?: string; instructor?: string }): Promise<Course[]>;

  // Enrollment operations
  enrollUser(enrollment: InsertEnrollment): Promise<Enrollment>;
  getUserEnrollments(userId: string): Promise<any[]>;
  isUserEnrolled(userId: string, courseId: string): Promise<boolean>;
  updateEnrollmentProgress(userId: string, courseId: string, progress: number): Promise<void>;
  getEnrollment(userId: string, courseId: string): Promise<Enrollment | undefined>;

  // Progress operations
  updateProgress(progress: InsertProgress): Promise<Progress>;
  getUserProgress(userId: string, courseId: string): Promise<any[]>;
  getUserOverallProgress(userId: string): Promise<{ totalCourses: number; completedCourses: number; totalHours: number }>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getCourseReviews(courseId: string): Promise<any[]>;
  updateCourseRating(courseId: string): Promise<void>;

  // Discussion operations
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  getCourseDiscussions(courseId: string): Promise<any[]>;
  createReply(reply: InsertReply): Promise<Reply>;
  getDiscussionReplies(discussionId: string): Promise<any[]>;

  // Certification operations
  createCertification(certification: InsertCertification): Promise<Certification>;
  getUserCertifications(userId: string): Promise<any[]>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, paymentIntentId?: string): Promise<Order>;
  updateOrderByReference(reference: string, status: string): Promise<Order>;
  getUserOrders(userId: string): Promise<any[]>;

  // Curriculum operations
  getCourseModules(courseId: string): Promise<any[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, updates: Partial<InsertModule>): Promise<Module>;
  deleteModule(id: string): Promise<void>;
  reorderModules(courseId: string, moduleOrder: string[]): Promise<void>;

  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  reorderLessons(moduleId: string, lessonOrder: string[]): Promise<void>;
  getLessonById(lessonId: string): Promise<any>;
  getCourseLessons(courseId: string): Promise<any[]>;

  // Quiz operations
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuizById(id: string): Promise<Quiz | undefined>;
  getLessonQuizzes(lessonId: string): Promise<Quiz[]>;
  getCourseQuizzes(courseId: string): Promise<Quiz[]>;
  deleteQuiz(id: string): Promise<void>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer>;
  submitQuizAttempt(attempt: { quizId: string; userId: string; answers: any[]; timeSpent?: number }): Promise<QuizAttempt>;
  getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;
  recordQuizResponse(response: InsertQuizResponse): Promise<QuizResponse>;
  createOrUpdateQuiz(lessonId: string, quizData: any): Promise<any>;
  getQuizWithQuestions(quizId: string, hideCorrect?: boolean): Promise<any>;
  gradeQuizAttempt(attemptId: string, userId: string, quizId: string, responses: any[], timeSpent?: number): Promise<QuizAttempt>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentById(id: string): Promise<Assignment | undefined>;
  getAssignmentByLessonId(lessonId: string): Promise<Assignment | null>;
  getLessonAssignments(lessonId: string): Promise<Assignment[]>;
  deleteAssignment(id: string): Promise<void>;
  submitAssignment(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission>;
  gradeAssignment(submissionId: string, score: number, feedback: string, graderId: string): Promise<AssignmentSubmission>;
  getUserAssignmentSubmissions(userId: string, assignmentId: string): Promise<AssignmentSubmission[]>;
  createOrUpdateAssignment(lessonId: string, assignmentData: any): Promise<any>;

  // Instructor payout operations
  createInstructorPayout(payout: InsertInstructorPayout): Promise<InstructorPayout>;
  getInstructorPayouts(instructorId: string): Promise<InstructorPayout[]>;
  updatePayoutStatus(payoutId: string, status: string): Promise<InstructorPayout>;

  // Instructor application operations
  createInstructorApplication(application: InsertInstructorApplication): Promise<InstructorApplication>;
  getInstructorApplicationByUserId(userId: string): Promise<InstructorApplication | undefined>;
  getInstructorApplications(filters?: { status?: string; page?: number; limit?: number }): Promise<InstructorApplication[]>;
  updateInstructorApplication(id: string, updates: Partial<InstructorApplication>): Promise<InstructorApplication>;

  // Admin operations
  getAdminStats(): Promise<{ totalUsers: number; totalInstructors: number; pendingApplications: number; totalCourses: number; monthlyRevenue: number; activeStudents: number }>;

  // Course resources operations
  createCourseResource(resource: InsertCourseResource): Promise<CourseResource>;
  getLessonResources(lessonId: string): Promise<CourseResource[]>;
  getCourseResources(courseId: string): Promise<CourseResource[]>;
  deleteCourseResource(id: string): Promise<void>;

  // Course publishing operations
  validateCourseForPublishing(courseId: string): Promise<{ isValid: boolean; checks: Record<string, boolean>; errors: string[] }>;
  publishCourse(courseId: string): Promise<void>;
  unpublishCourse(courseId: string): Promise<void>;

  // Real data methods
  getRealPlatformStats(): Promise<{ totalCourses: number; totalStudents: number; averageRating: number; totalHours: number }>;
  getInstructorMonthlyRevenue(instructorId: string): Promise<{ month: string; amount: number }[]>;
  getInstructorAnalytics(instructorId: string): Promise<any[]>;
  getInstructorPendingSubmissions(instructorId: string): Promise<any[]>;
  getInstructorStudentQuestions(instructorId: string): Promise<any[]>;
  getStudentPendingAssignments(userId: string): Promise<any[]>;
  getStudentPendingQuizzes(userId: string): Promise<any[]>;
  getCourseRecommendations(userId: string): Promise<any[]>;
  getStudentDownloadableResources(userId: string): Promise<any[]>;
}
