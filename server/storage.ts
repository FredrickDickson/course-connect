// @ts-nocheck
/**
 * Storage Layer
 *
 * Implements all database operations for the CIMA Learning Platform.
 * Provides a clean abstraction layer over Drizzle ORM for data access.
 *
 * Key Responsibilities:
 * - User management and authentication
 * - Course catalog and content management
 * - Enrollment and progress tracking
 * - Payment and order processing
 * - Discussion forums and community features
 * - Instructor analytics and payouts
 */

import {
  users,
  courses,
  modules,
  lessons,
  enrollments,
  progress,
  reviews,
  discussions,
  replies,
  certifications,
  orders,
  categories,
  courseResources,
  quizzes,
  quizQuestions,
  quizAnswers,
  quizAttempts,
  quizResponses,
  assignments,
  assignmentSubmissions,
  instructorPayouts,
  instructorApplications,
  type User,
  type UpsertUser,
  type Course,
  type InsertCourse,
  type Module,
  type InsertModule,
  type Lesson,
  type InsertLesson,
  type Enrollment,
  type InsertEnrollment,
  type Progress,
  type InsertProgress,
  type Review,
  type InsertReview,
  type Discussion,
  type InsertDiscussion,
  type Reply,
  type InsertReply,
  type Certification,
  type InsertCertification,
  type Order,
  type InsertOrder,
  type Category,
  type InsertCategory,
  type CourseResource,
  type InsertCourseResource,
  type Quiz,
  type InsertQuiz,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAnswer,
  type InsertQuizAnswer,
  type QuizAttempt,
  type InsertQuizAttempt,
  type QuizResponse,
  type InsertQuizResponse,
  type Assignment,
  type InsertAssignment,
  type AssignmentSubmission,
  type InsertAssignmentSubmission,
  type InstructorPayout,
  type InsertInstructorPayout,
  type InstructorApplication,
  type InsertInstructorApplication,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, sql, avg, count } from "drizzle-orm";

/**
 * Storage Interface
 * Defines all database operations available in the application
 */
export interface IStorage {
  // User operations (required for Replit Auth integration)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  updateUserPaystackInfo(id: string, customerCode: string): Promise<User>;
  updateUserRole(
    id: string,
    role: "student" | "instructor" | "admin",
  ): Promise<User>;
  getInstructors(): Promise<User[]>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Course operations - simplified for now
  getCourses(filters?: {
    category?: string;
    search?: string;
    level?: string;
    featured?: boolean;
  }): Promise<any[]>;
  getCourseById(id: string): Promise<any>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getFeaturedCourses(): Promise<any[]>;
  getInstructorCourses(instructorId: string): Promise<any[]>;
  getInstructorStats(instructorId: string): Promise<{
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
  }>;

  // Enrollment operations - simplified
  enrollUser(enrollment: InsertEnrollment): Promise<Enrollment>;
  getUserEnrollments(userId: string): Promise<any[]>;
  isUserEnrolled(userId: string, courseId: string): Promise<boolean>;
  updateEnrollmentProgress(
    userId: string,
    courseId: string,
    progress: number,
  ): Promise<void>;

  // Progress operations
  updateProgress(progress: InsertProgress): Promise<Progress>;
  getUserProgress(userId: string, courseId: string): Promise<any[]>;
  getUserOverallProgress(userId: string): Promise<{
    totalCourses: number;
    completedCourses: number;
    totalHours: number;
  }>;

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
  createCertification(
    certification: InsertCertification,
  ): Promise<Certification>;
  getUserCertifications(userId: string): Promise<any[]>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;

  // Curriculum management operations
  getCourseModules(courseId: string): Promise<any[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, updates: Partial<InsertModule>): Promise<Module>;
  deleteModule(id: string): Promise<void>;

  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  updateOrderStatus(
    id: string,
    status: string,
    paymentIntentId?: string,
  ): Promise<Order>;
  updateOrderByReference(reference: string, status: string): Promise<Order>;
  getUserOrders(userId: string): Promise<any[]>;

  // Quiz operations
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuizById(id: string): Promise<Quiz | undefined>;
  getLessonQuizzes(lessonId: string): Promise<Quiz[]>;
  getCourseQuizzes(courseId: string): Promise<Quiz[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer>;
  submitQuizAttempt(attempt: {
    quizId: string;
    userId: string;
    answers: any[];
    timeSpent?: number;
  }): Promise<QuizAttempt>;
  getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;
  getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | undefined>;
  recordQuizResponse(response: InsertQuizResponse): Promise<QuizResponse>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentById(id: string): Promise<Assignment | undefined>;
  getLessonAssignments(lessonId: string): Promise<Assignment[]>;
  submitAssignment(
    submission: InsertAssignmentSubmission,
  ): Promise<AssignmentSubmission>;
  gradeAssignment(
    submissionId: string,
    score: number,
    feedback: string,
    graderId: string,
  ): Promise<AssignmentSubmission>;
  getUserAssignmentSubmissions(
    userId: string,
    assignmentId: string,
  ): Promise<AssignmentSubmission[]>;

  // Instructor payout operations
  createInstructorPayout(
    payout: InsertInstructorPayout,
  ): Promise<InstructorPayout>;
  getInstructorPayouts(instructorId: string): Promise<InstructorPayout[]>;
  updatePayoutStatus(
    payoutId: string,
    status: string,
  ): Promise<InstructorPayout>;

  // Instructor application operations
  createInstructorApplication(
    application: InsertInstructorApplication,
  ): Promise<InstructorApplication>;
  getInstructorApplicationByUserId(
    userId: string,
  ): Promise<InstructorApplication | undefined>;
  getInstructorApplications(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<InstructorApplication[]>;
  updateInstructorApplication(
    id: string,
    updates: Partial<InstructorApplication>,
  ): Promise<InstructorApplication>;

  // Admin operations
  getAdminStats(): Promise<{
    totalUsers: number;
    totalInstructors: number;
    pendingApplications: number;
    totalCourses: number;
    monthlyRevenue: number;
    activeStudents: number;
  }>;
  getUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<User[]>;
  getCoursesForAdmin(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    instructor?: string;
  }): Promise<Course[]>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        email: userData.email?.toLowerCase(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          email: userData.email?.toLowerCase(),
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    return user;
  }

  async updateUserPaystackInfo(
    id: string,
    customerCode: string,
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        paystackCustomerCode: customerCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(
    id: string,
    role: "student" | "instructor" | "admin",
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getInstructors(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "instructor"))
      .orderBy(users.firstName, users.lastName);
  }

  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // ============================================================================
  // COURSE OPERATIONS
  // ============================================================================

  async getCourses(filters?: {
    category?: string;
    search?: string;
    level?: string;
    featured?: boolean;
  }): Promise<any[]> {
    const conditions = [eq(courses.isPublished, true)];

    if (filters?.category && filters.category !== "all") {
      // Find category by slug or ID
      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, filters.category))
        .limit(1);
      if (cat) {
        conditions.push(eq(courses.categoryId, cat.id));
      } else {
        // Try filter by ID if slug not found
        try {
          conditions.push(eq(courses.categoryId, filters.category));
        } catch (e) {
          // Invalid UUID, ignore
        }
      }
    }

    if (filters?.level && filters.level !== "all") {
      conditions.push(eq(courses.level, filters.level));
    }

    if (filters?.search) {
      conditions.push(
        sql`${courses.title} ILIKE ${"%" + filters.search + "%"}`,
      );
    }

    if (filters?.featured !== undefined) {
      conditions.push(eq(courses.isFeatured, filters.featured));
    }

    return await db
      .select({
        id: courses.id,
        title: courses.title,
        subtitle: courses.subtitle,
        description: courses.description,
        instructorId: courses.instructorId,
        categoryId: courses.categoryId,
        level: courses.level,
        price: courses.price,
        currency: courses.currency,
        thumbnailUrl: courses.thumbnailUrl,
        duration: courses.duration,
        isPublished: courses.isPublished,
        isFeatured: courses.isFeatured,
        avgRating: courses.avgRating,
        ratingCount: courses.ratingCount,
        enrollmentCount: courses.enrollmentCount,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
        instructor: {
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(courses)
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(courses.createdAt));
  }

  async getCourseById(id: string): Promise<any> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(
    id: string,
    updates: Partial<InsertCourse>,
  ): Promise<Course> {
    const [updatedCourse] = await db
      .update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getFeaturedCourses(): Promise<any[]> {
    return await this.getCourses({ featured: true });
  }

  async getInstructorCourses(instructorId: string): Promise<any[]> {
    return await db
      .select({
        id: courses.id,
        title: courses.title,
        subtitle: courses.subtitle,
        description: courses.description,
        instructorId: courses.instructorId,
        categoryId: courses.categoryId,
        level: courses.level,
        price: courses.price,
        currency: courses.currency,
        thumbnailUrl: courses.thumbnailUrl,
        promoVideoUrl: courses.promoVideoUrl,
        duration: courses.duration,
        isPublished: courses.isPublished,
        isFeatured: courses.isFeatured,
        avgRating: courses.avgRating,
        ratingCount: courses.ratingCount,
        enrollmentCount: courses.enrollmentCount,
        tags: courses.tags,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(courses)
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(eq(courses.instructorId, instructorId));
  }

  async getInstructorStats(instructorId: string): Promise<{
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    const instructorCourses = await db
      .select({ id: courses.id, price: courses.price })
      .from(courses)
      .where(eq(courses.instructorId, instructorId));
    const courseIds = instructorCourses.map((c) => c.id);

    const totalCourses = instructorCourses.length;

    let totalStudents = 0;
    if (courseIds.length > 0) {
      const [studentCount] = await db
        .select({ count: count(sql`DISTINCT ${enrollments.userId}`) })
        .from(enrollments)
        .where(sql`${enrollments.courseId} IN ${courseIds}`);
      totalStudents = studentCount.count;
    }

    let totalRevenue = 0;
    if (courseIds.length > 0) {
      const instructorOrders = await db
        .select({ amount: orders.amount })
        .from(orders)
        .where(
          and(
            sql`${orders.courseId} IN ${courseIds}`,
            eq(orders.status, "completed"),
          ),
        );
      totalRevenue = instructorOrders.reduce(
        (sum, order) => sum + (Number(order.amount) || 0),
        0,
      );
    }

    let averageRating = 0;
    if (courseIds.length > 0) {
      const [avgRating] = await db
        .select({ avg: avg(reviews.rating) })
        .from(reviews)
        .where(sql`${reviews.courseId} IN ${courseIds}`);
      averageRating = Number(avgRating.avg) || 0;
    }

    return {
      totalCourses,
      totalStudents,
      totalRevenue,
      averageRating,
    };
  }

  // ============================================================================
  // ENROLLMENT OPERATIONS
  // ============================================================================

  async enrollUser(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db
      .insert(enrollments)
      .values(enrollment)
      .returning();
    return newEnrollment;
  }

  async getUserEnrollments(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
  }

  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
      )
      .limit(1);
    return !!enrollment;
  }

  async updateEnrollmentProgress(
    userId: string,
    courseId: string,
    progressValue: number,
  ): Promise<void> {
    await db
      .update(enrollments)
      .set({ progress: progressValue.toString() })
      .where(
        and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
      );
  }

  // ============================================================================
  // PROGRESS OPERATIONS
  // ============================================================================

  async updateProgress(progressData: InsertProgress): Promise<Progress> {
    const [newProgress] = await db
      .insert(progress)
      .values(progressData)
      .returning();
    return newProgress;
  }

  async getUserProgress(userId: string, courseId: string): Promise<any[]> {
    const userProgress = await db
      .select()
      .from(progress)
      .leftJoin(lessons, eq(progress.lessonId, lessons.id))
      .leftJoin(modules, eq(lessons.moduleId, modules.id))
      .where(and(eq(progress.userId, userId), eq(modules.courseId, courseId)));

    return userProgress.map((p) => ({
      ...p.progress,
      lesson: p.lessons,
    }));
  }

  async getUserOverallProgress(userId: string): Promise<{
    totalCourses: number;
    completedCourses: number;
    totalHours: number;
  }> {
    const userEnrollments = await db
      .select({
        progress: enrollments.progress,
        duration: courses.duration,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, userId));

    const totalCourses = userEnrollments.length;
    const completedCourses = userEnrollments.filter(
      (e) => Number(e.progress) >= 100,
    ).length;
    const totalHours = userEnrollments.reduce(
      (sum, e) => sum + (e.duration || 0),
      0,
    );

    return { totalCourses, completedCourses, totalHours };
  }

  // ============================================================================
  // REVIEW OPERATIONS
  // ============================================================================

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getCourseReviews(courseId: string): Promise<any[]> {
    const courseReviews = await db
      .select({
        review: reviews,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.courseId, courseId))
      .orderBy(desc(reviews.createdAt));

    return courseReviews.map((r) => ({
      ...r.review,
      user: r.user,
    }));
  }

  async updateCourseRating(courseId: string): Promise<void> {
    const [stats] = await db
      .select({
        avgRating: avg(reviews.rating),
        ratingCount: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.courseId, courseId));

    await db
      .update(courses)
      .set({
        avgRating: String(Number(stats.avgRating) || 0),
        ratingCount: stats.ratingCount,
      })
      .where(eq(courses.id, courseId));
  }

  // ============================================================================
  // DISCUSSION OPERATIONS
  // ============================================================================

  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const [newDiscussion] = await db
      .insert(discussions)
      .values(discussion)
      .returning();
    return newDiscussion;
  }

  async getCourseDiscussions(courseId: string): Promise<any[]> {
    const courseDiscussions = await db
      .select({
        discussion: discussions,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
        replyCount: count(replies.id),
      })
      .from(discussions)
      .leftJoin(users, eq(discussions.userId, users.id))
      .leftJoin(replies, eq(discussions.id, replies.discussionId))
      .where(eq(discussions.courseId, courseId))
      .groupBy(discussions.id, users.id)
      .orderBy(desc(discussions.createdAt));

    return courseDiscussions.map((d) => ({
      ...d.discussion,
      author: d.author,
      replyCount: d.replyCount,
    }));
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const [newReply] = await db.insert(replies).values(reply).returning();
    return newReply;
  }

  async getDiscussionReplies(discussionId: string): Promise<any[]> {
    const discussionReplies = await db
      .select({
        reply: replies,
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(replies)
      .leftJoin(users, eq(replies.userId, users.id))
      .where(eq(replies.discussionId, discussionId))
      .orderBy(desc(replies.createdAt));

    return discussionReplies.map((r) => ({
      ...r.reply,
      author: r.author,
    }));
  }

  // ============================================================================
  // CERTIFICATION OPERATIONS
  // ============================================================================

  async createCertification(
    certification: InsertCertification,
  ): Promise<Certification> {
    const [newCertification] = await db
      .insert(certifications)
      .values(certification)
      .returning();
    return newCertification;
  }

  async getUserCertifications(userId: string): Promise<any[]> {
    const userCertifications = await db
      .select({
        certification: certifications,
        course: {
          id: courses.id,
          title: courses.title,
          thumbnailUrl: courses.thumbnailUrl,
        },
      })
      .from(certifications)
      .leftJoin(courses, eq(certifications.courseId, courses.id))
      .where(eq(certifications.userId, userId))
      .orderBy(desc(certifications.issuedAt));

    return userCertifications.map((c) => ({
      ...c.certification,
      course: c.course,
    }));
  }

  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(
    id: string,
    status: string,
    paymentIntentId?: string,
  ): Promise<Order> {
    const updateData: any = { status: status as any };
    if (paymentIntentId) {
      updateData.paystackReference = paymentIntentId;
    }

    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderByReference(
    reference: string,
    status: string,
  ): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.paystackReference, reference))
      .returning();
    return updatedOrder;
  }

  async getUserOrders(userId: string): Promise<any[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  // ============================================================================
  // QUIZ OPERATIONS
  // ============================================================================

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async getQuizById(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getLessonQuizzes(lessonId: string): Promise<Quiz[]> {
    return await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.lessonId, lessonId));
  }

  async createQuizQuestion(
    question: InsertQuizQuestion,
  ): Promise<QuizQuestion> {
    const [newQuestion] = await db
      .insert(quizQuestions)
      .values(question)
      .returning();
    return newQuestion;
  }

  async createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    const [newAnswer] = await db.insert(quizAnswers).values(answer).returning();
    return newAnswer;
  }

  async submitQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db
      .insert(quizAttempts)
      .values(attempt)
      .returning();
    return newAttempt;
  }

  async recordQuizResponse(
    response: InsertQuizResponse,
  ): Promise<QuizResponse> {
    const [newResponse] = await db
      .insert(quizResponses)
      .values(response)
      .returning();
    return newResponse;
  }

  async getQuizAttempts(
    userId: string,
    quizId: string,
  ): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(
        and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)),
      )
      .orderBy(desc(quizAttempts.startedAt));
  }

  async getCourseQuizzes(courseId: string): Promise<Quiz[]> {
    return await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.lessonId, courseId));
  }

  async getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
      );
    return enrollment;
  }

  async getQuizByLessonId(lessonId: string): Promise<any> {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.lessonId, lessonId))
      .limit(1);
    if (!quiz) return null;
    return this.getQuizWithQuestions(quiz.id, false);
  }

  async deleteQuiz(quizId: string): Promise<void> {
    // quiz_questions cascade-deletes quiz_answers via FK
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    await db.delete(quizzes).where(eq(quizzes.id, quizId));
  }

  // ============================================================================
  // ASSIGNMENT OPERATIONS
  // ============================================================================

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db
      .insert(assignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async getAssignmentById(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id));
    return assignment;
  }

  async getLessonAssignments(lessonId: string): Promise<Assignment[]> {
    return await db
      .select()
      .from(assignments)
      .where(eq(assignments.lessonId, lessonId));
  }

  async submitAssignment(
    submission: InsertAssignmentSubmission,
  ): Promise<AssignmentSubmission> {
    const [newSubmission] = await db
      .insert(assignmentSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async gradeAssignment(
    submissionId: string,
    score: number,
    feedback: string,
    graderId: string,
  ): Promise<AssignmentSubmission> {
    const [updatedSubmission] = await db
      .update(assignmentSubmissions)
      .set({
        score,
        feedback,
        gradedBy: graderId,
        gradedAt: new Date(),
      })
      .where(eq(assignmentSubmissions.id, submissionId))
      .returning();
    return updatedSubmission;
  }

  async getUserAssignmentSubmissions(
    userId: string,
    assignmentId: string,
  ): Promise<AssignmentSubmission[]> {
    return await db
      .select()
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.userId, userId),
          eq(assignmentSubmissions.assignmentId, assignmentId),
        ),
      );
  }

  async getAssignmentByLessonId(
    lessonId: string,
  ): Promise<Assignment | undefined> {
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.lessonId, lessonId))
      .limit(1);
    return assignment;
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    await db
      .delete(assignmentSubmissions)
      .where(eq(assignmentSubmissions.assignmentId, assignmentId));
    await db.delete(assignments).where(eq(assignments.id, assignmentId));
  }

  // ============================================================================
  // INSTRUCTOR PAYOUT OPERATIONS
  // ============================================================================

  async createInstructorPayout(
    payout: InsertInstructorPayout,
  ): Promise<InstructorPayout> {
    const [newPayout] = await db
      .insert(instructorPayouts)
      .values(payout)
      .returning();
    return newPayout;
  }

  async getInstructorPayouts(
    instructorId: string,
  ): Promise<InstructorPayout[]> {
    return await db
      .select()
      .from(instructorPayouts)
      .where(eq(instructorPayouts.instructorId, instructorId));
  }

  async updatePayoutStatus(
    payoutId: string,
    status: string,
  ): Promise<InstructorPayout> {
    const [updatedPayout] = await db
      .update(instructorPayouts)
      .set({
        status: status as any,
        processedAt: status === "completed" ? new Date() : undefined,
      })
      .where(eq(instructorPayouts.id, payoutId))
      .returning();
    return updatedPayout;
  }

  // ============================================================================
  // INSTRUCTOR APPLICATION OPERATIONS
  // ============================================================================

  async createInstructorApplication(
    application: InsertInstructorApplication,
  ): Promise<InstructorApplication> {
    const [newApplication] = await db
      .insert(instructorApplications)
      .values(application)
      .returning();
    return newApplication;
  }

  async getInstructorApplicationByUserId(
    userId: string,
  ): Promise<InstructorApplication | undefined> {
    const [application] = await db
      .select()
      .from(instructorApplications)
      .where(eq(instructorApplications.userId, userId))
      .orderBy(desc(instructorApplications.submittedAt));
    return application;
  }

  async getInstructorApplications(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<InstructorApplication[]> {
    let query = db.select().from(instructorApplications) as any;

    if (filters?.status) {
      query = query.where(
        eq(instructorApplications.status, filters.status as any),
      );
    }

    query = query.orderBy(desc(instructorApplications.submittedAt));

    if (filters?.page && filters?.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.limit(filters.limit).offset(offset);
    }

    return await query;
  }

  async updateInstructorApplication(
    id: string,
    updates: Partial<InstructorApplication>,
  ): Promise<InstructorApplication> {
    const [updatedApplication] = await db
      .update(instructorApplications)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(instructorApplications.id, id))
      .returning();
    return updatedApplication;
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalInstructors: number;
    pendingApplications: number;
    totalCourses: number;
    monthlyRevenue: number;
    activeStudents: number;
  }> {
    // Get total users
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(users);

    // Get total instructors
    const [{ totalInstructors }] = await db
      .select({ totalInstructors: count() })
      .from(users)
      .where(eq(users.role, "instructor"));

    // Get pending applications
    const [{ pendingApplications }] = await db
      .select({ pendingApplications: count() })
      .from(instructorApplications)
      .where(eq(instructorApplications.status, "pending"));

    // Get total courses
    const [{ totalCourses }] = await db
      .select({ totalCourses: count() })
      .from(courses);

    // Real monthly revenue: sum of completed orders this calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [revenueRow] = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${orders.amount} AS NUMERIC)), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "completed"),
          sql`${orders.createdAt} >= ${monthStart}`,
        ),
      );
    const monthlyRevenue = Number(revenueRow?.total ?? 0);

    // Active students: distinct enrolled users
    const [activeRow] = await db
      .select({ count: count(sql`DISTINCT ${enrollments.userId}`) })
      .from(enrollments);
    const activeStudents = Number(activeRow?.count ?? 0);

    return {
      totalUsers: Number(totalUsers),
      totalInstructors: Number(totalInstructors),
      pendingApplications: Number(pendingApplications),
      totalCourses: Number(totalCourses),
      monthlyRevenue,
      activeStudents,
    };
  }

  async getUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<User[]> {
    let query = db.select().from(users) as any;

    if (filters?.role) {
      query = query.where(eq(users.role, filters.role as any));
    }

    if (filters?.search) {
      query = query.where(
        sql`${users.firstName} ILIKE ${`%${filters.search}%`} OR ${users.lastName} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`}`,
      );
    }

    query = query.orderBy(desc(users.createdAt));

    if (filters?.page && filters?.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.limit(filters.limit).offset(offset);
    }

    return await query;
  }

  async getCoursesForAdmin(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    instructor?: string;
  }): Promise<Course[]> {
    let query = db.select().from(courses) as any;

    if (filters?.instructor) {
      query = query.where(eq(courses.instructorId, filters.instructor));
    }

    query = query.orderBy(desc(courses.createdAt));

    if (filters?.page && filters?.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.limit(filters.limit).offset(offset);
    }

    return await query;
  }

  // ============================================================================
  // CURRICULUM MANAGEMENT OPERATIONS
  // ============================================================================

  async getCourseModules(courseId: string): Promise<any[]> {
    const modulesList = await db
      .select()
      .from(modules)
      .where(sql`${modules.courseId} = ${courseId}`)
      .orderBy(modules.order);

    const modulesWithLessons = await Promise.all(
      modulesList.map(async (module) => {
        const lessonsList = await db
          .select()
          .from(lessons)
          .where(sql`${lessons.moduleId} = ${module.id}`)
          .orderBy(lessons.order);

        return {
          ...module,
          lessons: lessonsList,
        };
      }),
    );

    return modulesWithLessons;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${modules.order}), -1)` })
      .from(modules)
      .where(sql`${modules.courseId} = ${module.courseId}`);

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const [newModule] = await db
      .insert(modules)
      .values({ ...module, order: nextOrder })
      .returning();

    return newModule;
  }

  async updateModule(
    id: string,
    updates: Partial<InsertModule>,
  ): Promise<Module> {
    const [updated] = await db
      .update(modules)
      .set(updates)
      .where(eq(modules.id, id))
      .returning();

    return updated;
  }

  async deleteModule(id: string): Promise<void> {
    await db.delete(modules).where(eq(modules.id, id));
  }

  async reorderModules(courseId: string, moduleOrder: string[]): Promise<void> {
    for (let i = 0; i < moduleOrder.length; i++) {
      await db
        .update(modules)
        .set({ order: i })
        .where(eq(modules.id, moduleOrder[i]));
    }
  }

  async reorderLessons(moduleId: string, lessonOrder: string[]): Promise<void> {
    for (let i = 0; i < lessonOrder.length; i++) {
      await db
        .update(lessons)
        .set({ order: i })
        .where(eq(lessons.id, lessonOrder[i]));
    }
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${lessons.order}), -1)` })
      .from(lessons)
      .where(sql`${lessons.moduleId} = ${lesson.moduleId}`);

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const [newLesson] = await db
      .insert(lessons)
      .values({ ...lesson, order: nextOrder })
      .returning();

    return newLesson;
  }

  async updateLesson(
    id: string,
    updates: Partial<InsertLesson>,
  ): Promise<Lesson> {
    const [updated] = await db
      .update(lessons)
      .set(updates)
      .where(eq(lessons.id, id))
      .returning();

    return updated;
  }

  async deleteLesson(id: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  // ============================================================================
  // COURSE RESOURCES OPERATIONS
  // ============================================================================

  async createCourseResource(
    resource: InsertCourseResource,
  ): Promise<CourseResource> {
    const [newResource] = await db
      .insert(courseResources)
      .values(resource)
      .returning();

    return newResource;
  }

  async getLessonResources(lessonId: string): Promise<CourseResource[]> {
    return await db
      .select()
      .from(courseResources)
      .where(eq(courseResources.lessonId, lessonId));
  }

  async getCourseResources(courseId: string): Promise<CourseResource[]> {
    return await db
      .select()
      .from(courseResources)
      .where(eq(courseResources.courseId, courseId));
  }

  async deleteCourseResource(id: string): Promise<void> {
    await db.delete(courseResources).where(eq(courseResources.id, id));
  }

  // ============================================================================
  // QUIZ AND ASSIGNMENT OPERATIONS
  // ============================================================================

  async createOrUpdateQuiz(lessonId: string, quizData: any) {
    // Check if quiz already exists for this lesson
    const existing = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.lessonId, lessonId))
      .limit(1);

    // NOTE: questions are stored in the quiz_questions & quiz_answers tables,
    // not as a JSON column on quizzes. Only store quiz-level metadata here.
    const quizPayload = {
      lessonId,
      title: quizData.title,
      description: quizData.description,
      passingScore: quizData.passingScore,
      timeLimit: quizData.timeLimit,
      maxAttempts: quizData.maxAttempts,
      isRequired: quizData.isRequired ?? false,
    };

    let quiz: Quiz;
    if (existing.length > 0) {
      const [updated] = await db
        .update(quizzes)
        .set(quizPayload)
        .where(eq(quizzes.id, existing[0].id))
        .returning();
      quiz = updated;
    } else {
      const [created] = await db
        .insert(quizzes)
        .values(quizPayload)
        .returning();
      quiz = created;
    }

    // Upsert questions and answers if provided
    if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      // Delete existing questions (cascade removes answers)
      await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));

      for (let i = 0; i < quizData.questions.length; i++) {
        const q = quizData.questions[i];
        const [question] = await db
          .insert(quizQuestions)
          .values({
            quizId: quiz.id,
            question: q.question,
            questionType: q.questionType || "multiple_choice",
            points: q.points ?? 1,
            order: i,
          })
          .returning();

        if (Array.isArray(q.answers)) {
          for (let j = 0; j < q.answers.length; j++) {
            await db.insert(quizAnswers).values({
              questionId: question.id,
              answer: q.answers[j].answer,
              isCorrect: q.answers[j].isCorrect ?? false,
              order: j,
            });
          }
        }
      }
    }

    return await this.getQuizWithQuestions(quiz.id);
  }

  // Fetch quiz with all questions and answers (answers shuffled, isCorrect hidden for students)
  async getQuizWithQuestions(quizId: string, hideCorrect = false) {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId));
    if (!quiz) return null;

    const questions = await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);

    const questionsWithAnswers = await Promise.all(
      questions.map(async (q) => {
        const answers = await db
          .select()
          .from(quizAnswers)
          .where(eq(quizAnswers.questionId, q.id))
          .orderBy(quizAnswers.order);

        return {
          ...q,
          answers: hideCorrect
            ? answers.map(({ isCorrect: _hidden, ...rest }) => rest)
            : answers,
        };
      }),
    );

    return { ...quiz, questions: questionsWithAnswers };
  }

  // Grade a quiz attempt: compare submitted answers, compute score, persist result
  async gradeQuizAttempt(
    attemptId: string,
    userId: string,
    quizId: string,
    responses: {
      questionId: string;
      answerId?: string;
      responseText?: string;
    }[],
    timeSpent?: number,
  ): Promise<QuizAttempt> {
    const quiz = await this.getQuizWithQuestions(quizId, false);
    if (!quiz) throw new Error("Quiz not found");

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const resp of responses) {
      const question = quiz.questions.find(
        (q: any) => q.id === resp.questionId,
      );
      if (!question) continue;

      totalPoints += question.points ?? 1;

      // Check correctness
      let isCorrect = false;
      if (resp.answerId) {
        const answer = (question.answers as any[]).find(
          (a: any) => a.id === resp.answerId,
        );
        isCorrect = (answer?.isCorrect as boolean | null) ?? false;
      }

      if (isCorrect) earnedPoints += question.points ?? 1;

      await db.insert(quizResponses).values({
        attemptId,
        questionId: resp.questionId,
        answerId: resp.answerId || null,
        responseText: resp.responseText || null,
        isCorrect,
        pointsEarned: isCorrect ? (question.points ?? 1) : 0,
      });
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= (quiz.passingScore ?? 80);

    const [attempt] = await db
      .update(quizAttempts)
      .set({
        score: score.toFixed(2),
        totalPoints,
        passed,
        timeSpent: timeSpent ?? null,
        completedAt: new Date(),
      })
      .where(eq(quizAttempts.id, attemptId))
      .returning();

    return attempt;
  }

  // ── Real data methods for previously-mocked routes ───────────────────────

  async getRealPlatformStats(): Promise<{
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
    totalHours: number;
  }> {
    const [{ totalCourses }] = await db
      .select({ totalCourses: count() })
      .from(courses)
      .where(eq(courses.isPublished, true));

    const [{ totalStudents }] = await db
      .select({ totalStudents: count(sql`DISTINCT ${enrollments.userId}`) })
      .from(enrollments);

    const [{ avgRating }] = await db
      .select({ avgRating: avg(reviews.rating) })
      .from(reviews);

    const [{ totalHours }] = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(${courses.duration}), 0)`,
      })
      .from(courses)
      .where(eq(courses.isPublished, true));

    return {
      totalCourses: Number(totalCourses),
      totalStudents: Number(totalStudents),
      averageRating: Math.round((Number(avgRating) || 0) * 10) / 10,
      totalHours: Number(totalHours),
    };
  }

  async getInstructorMonthlyRevenue(
    instructorId: string,
  ): Promise<{ month: string; amount: number }[]> {
    const instructorCourseIds = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.instructorId, instructorId));
    const ids = instructorCourseIds.map((c) => c.id);
    if (ids.length === 0) return [];

    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(${orders.createdAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${orders.createdAt})`,
        year: sql<number>`EXTRACT(YEAR FROM ${orders.createdAt})`,
        amount: sql<number>`SUM(CAST(${orders.amount} AS NUMERIC))`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "completed"),
          sql`${orders.courseId} = ANY(ARRAY[${sql.join(
            ids.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`,
        ),
      )
      .groupBy(
        sql`TO_CHAR(${orders.createdAt}, 'Mon')`,
        sql`EXTRACT(MONTH FROM ${orders.createdAt})`,
        sql`EXTRACT(YEAR FROM ${orders.createdAt})`,
      )
      .orderBy(
        sql`EXTRACT(YEAR FROM ${orders.createdAt})`,
        sql`EXTRACT(MONTH FROM ${orders.createdAt})`,
      );

    return rows.map((r) => ({ month: r.month, amount: Number(r.amount) }));
  }

  async getInstructorAnalytics(instructorId: string): Promise<any[]> {
    const instructorCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        avgRating: courses.avgRating,
      })
      .from(courses)
      .where(eq(courses.instructorId, instructorId));

    return await Promise.all(
      instructorCourses.map(async (course) => {
        const [{ enrollmentCount }] = await db
          .select({ enrollmentCount: count() })
          .from(enrollments)
          .where(eq(enrollments.courseId, course.id));

        const [{ revenue }] = await db
          .select({
            revenue: sql<number>`COALESCE(SUM(CAST(${orders.amount} AS NUMERIC)), 0)`,
          })
          .from(orders)
          .where(
            and(eq(orders.courseId, course.id), eq(orders.status, "completed")),
          );

        const [{ completionRate }] = await db
          .select({
            completionRate: sql<number>`COALESCE(
              ROUND(100.0 * COUNT(CASE WHEN CAST(${enrollments.progress} AS NUMERIC) >= 100 THEN 1 END) / NULLIF(COUNT(*), 0), 0),
              0
            )`,
          })
          .from(enrollments)
          .where(eq(enrollments.courseId, course.id));

        return {
          id: course.id,
          title: course.title,
          enrollmentCount: Number(enrollmentCount),
          avgRating: Number(course.avgRating) || 0,
          revenue: Number(revenue),
          completionRate: Number(completionRate),
        };
      }),
    );
  }

  async getInstructorPendingSubmissions(instructorId: string): Promise<any[]> {
    const instructorCourseIds = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.instructorId, instructorId));
    const courseIds = instructorCourseIds.map((c) => c.id);
    if (courseIds.length === 0) return [];

    // Find lessons in instructor courses, then assignments, then ungraded submissions
    const results = await db
      .select({
        id: assignmentSubmissions.id,
        content: assignmentSubmissions.content,
        submittedAt: assignmentSubmissions.submittedAt,
        assignmentTitle: assignments.title,
        studentFirst: users.firstName,
        studentLast: users.lastName,
      })
      .from(assignmentSubmissions)
      .leftJoin(
        assignments,
        eq(assignmentSubmissions.assignmentId, assignments.id),
      )
      .leftJoin(lessons, eq(assignments.lessonId, lessons.id))
      .leftJoin(modules, eq(lessons.moduleId, modules.id))
      .leftJoin(users, eq(assignmentSubmissions.userId, users.id))
      .where(
        and(
          sql`${modules.courseId} = ANY(ARRAY[${sql.join(
            courseIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`,
          sql`${assignmentSubmissions.gradedAt} IS NULL`,
        ),
      )
      .orderBy(desc(assignmentSubmissions.submittedAt))
      .limit(20);

    return results.map((r) => ({
      id: r.id,
      assignment: { title: r.assignmentTitle },
      student: { firstName: r.studentFirst, lastName: r.studentLast },
      submittedAt: r.submittedAt,
    }));
  }

  async getInstructorStudentQuestions(instructorId: string): Promise<any[]> {
    const instructorCourseIds = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.instructorId, instructorId));
    const courseIds = instructorCourseIds.map((c) => c.id);
    if (courseIds.length === 0) return [];

    const courseMap = Object.fromEntries(
      instructorCourseIds.map((c) => [c.id, c.title]),
    );

    const results = await db
      .select({
        id: discussions.id,
        content: discussions.content,
        courseId: discussions.courseId,
        createdAt: discussions.createdAt,
        studentFirst: users.firstName,
        studentLast: users.lastName,
      })
      .from(discussions)
      .leftJoin(users, eq(discussions.userId, users.id))
      .where(
        sql`${discussions.courseId} = ANY(ARRAY[${sql.join(
          courseIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])`,
      )
      .orderBy(desc(discussions.createdAt))
      .limit(20);

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      student: { firstName: r.studentFirst, lastName: r.studentLast },
      course: { title: courseMap[r.courseId!] || "Unknown Course" },
      createdAt: r.createdAt,
    }));
  }

  async getStudentPendingAssignments(userId: string): Promise<any[]> {
    const userEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
    const courseIds = userEnrollments.map((e) => e.courseId!);
    if (courseIds.length === 0) return [];

    const results = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        dueDate: assignments.dueDate,
        courseTitle: courses.title,
      })
      .from(assignments)
      .leftJoin(lessons, eq(assignments.lessonId, lessons.id))
      .leftJoin(modules, eq(lessons.moduleId, modules.id))
      .leftJoin(courses, eq(modules.courseId, courses.id))
      .where(
        and(
          sql`${modules.courseId} = ANY(ARRAY[${sql.join(
            courseIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`,
          // Not yet submitted by this user
          sql`${assignments.id} NOT IN (
            SELECT assignment_id FROM assignment_submissions WHERE user_id = ${userId}
          )`,
        ),
      )
      .orderBy(assignments.dueDate)
      .limit(10);

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      course: { title: r.courseTitle },
      dueDate: r.dueDate,
      submissionStatus: "pending",
    }));
  }

  async getStudentPendingQuizzes(userId: string): Promise<any[]> {
    const userEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
    const courseIds = userEnrollments.map((e) => e.courseId!);
    if (courseIds.length === 0) return [];

    const results = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        timeLimit: quizzes.timeLimit,
        courseTitle: courses.title,
      })
      .from(quizzes)
      .leftJoin(lessons, eq(quizzes.lessonId, lessons.id))
      .leftJoin(modules, eq(lessons.moduleId, modules.id))
      .leftJoin(courses, eq(modules.courseId, courses.id))
      .where(
        and(
          sql`${modules.courseId} = ANY(ARRAY[${sql.join(
            courseIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`,
          // No completed attempt by this user
          sql`${quizzes.id} NOT IN (
            SELECT quiz_id FROM quiz_attempts WHERE user_id = ${userId} AND completed_at IS NOT NULL
          )`,
        ),
      )
      .limit(10);

    const questionsCountPromises = results.map(async (quiz) => {
      const [{ qCount }] = await db
        .select({ qCount: count() })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, quiz.id));
      return {
        id: quiz.id,
        title: quiz.title,
        course: { title: quiz.courseTitle },
        questionCount: Number(qCount),
        timeLimit: quiz.timeLimit,
      };
    });

    return await Promise.all(questionsCountPromises);
  }

  async getCourseRecommendations(userId: string): Promise<any[]> {
    // Get categories of enrolled courses
    const enrolled = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
    const enrolledIds = enrolled.map((e) => e.courseId!);

    const enrolledCategoriesQuery =
      enrolledIds.length > 0
        ? await db
            .select({ categoryId: courses.categoryId })
            .from(courses)
            .where(
              sql`${courses.id} = ANY(ARRAY[${sql.join(
                enrolledIds.map((id) => sql`${id}::uuid`),
                sql`, `,
              )}])`,
            )
        : [];
    const categoryIds = Array.from(
      new Set(
        enrolledCategoriesQuery
          .map((c) => c.categoryId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    // Recommend published courses not already enrolled
    let whereClause = and(
      eq(courses.isPublished, true),
      enrolledIds.length > 0
        ? sql`${courses.id} != ALL(ARRAY[${sql.join(
            enrolledIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])`
        : sql`1=1`,
    );

    const recommended = await db
      .select()
      .from(courses)
      .where(whereClause)
      .orderBy(desc(courses.avgRating), desc(courses.enrollmentCount))
      .limit(6);

    return recommended.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
      avgRating: c.avgRating,
      enrollmentCount: c.enrollmentCount,
    }));
  }

  async getStudentDownloadableResources(userId: string): Promise<any[]> {
    const enrolled = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.userId, userId));
    const courseIds = enrolled.map((e) => e.courseId!);
    if (courseIds.length === 0) return [];

    return await db
      .select()
      .from(courseResources)
      .where(
        sql`${courseResources.courseId} = ANY(ARRAY[${sql.join(
          courseIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])`,
      )
      .orderBy(desc(courseResources.createdAt))
      .limit(20);
  }

  async createOrUpdateAssignment(lessonId: string, assignmentData: any) {
    const existing = await db
      .select()
      .from(assignments)
      .where(eq(assignments.lessonId, lessonId))
      .limit(1);

    // Only use columns that exist in the assignments schema
    const assignmentPayload = {
      lessonId,
      title: assignmentData.title,
      description: assignmentData.description,
      instructions: assignmentData.instructions ?? null,
      maxScore: assignmentData.maxScore ?? assignmentData.maxPoints ?? 100,
      dueDate: assignmentData.dueDate ? new Date(assignmentData.dueDate) : null,
      allowLateSubmission: assignmentData.allowLateSubmission ?? true,
      isRequired: assignmentData.isRequired ?? false,
    };

    if (existing.length > 0) {
      const [updated] = await db
        .update(assignments)
        .set(assignmentPayload)
        .where(eq(assignments.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(assignments)
        .values(assignmentPayload)
        .returning();
      return created;
    }
  }

  // ============================================================================
  // COURSE PUBLISHING OPERATIONS
  // ============================================================================

  async validateCourseForPublishing(courseId: string): Promise<{
    isValid: boolean;
    checks: {
      hasTitle: boolean;
      hasDescription: boolean;
      hasPrice: boolean;
      hasCategory: boolean;
      hasThumbnail: boolean;
      hasModules: boolean;
      hasLectures: boolean;
      hasVideoContent: boolean;
    };
    errors: string[];
  }> {
    const course = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);
    if (course.length === 0) {
      throw new Error("Course not found");
    }

    const courseData = course[0];
    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, courseId));

    const totalLessons = await db
      .select()
      .from(lessons)
      .where(
        sql`${lessons.moduleId} IN (SELECT id FROM ${modules} WHERE ${modules.courseId} = ${courseId})`,
      );

    const videoLessons = totalLessons.filter(
      (lesson) => lesson.contentType === "video",
    );

    const checks = {
      hasTitle: !!courseData.title && courseData.title.trim().length > 0,
      hasDescription:
        !!courseData.description && courseData.description.trim().length > 0,
      hasPrice: courseData.price !== null && courseData.price !== undefined,
      hasCategory: !!courseData.categoryId,
      hasThumbnail: !!courseData.thumbnailUrl,
      hasModules: courseModules.length > 0,
      hasLectures: totalLessons.length > 0,
      hasVideoContent: videoLessons.length > 0,
    };

    const errors: string[] = [];
    if (!checks.hasTitle) errors.push("Course must have a title");
    if (!checks.hasDescription) errors.push("Course must have a description");
    if (!checks.hasPrice) errors.push("Course must have a price set");
    if (!checks.hasCategory)
      errors.push("Course must be assigned to a category");
    if (!checks.hasThumbnail) errors.push("Course must have a thumbnail image");
    if (!checks.hasModules)
      errors.push("Course must have at least one section");
    if (!checks.hasLectures)
      errors.push("Course must have at least one lecture");
    if (!checks.hasVideoContent)
      errors.push("Course must have at least one video lecture");

    return {
      isValid: errors.length === 0,
      checks,
      errors,
    };
  }

  async publishCourse(courseId: string): Promise<void> {
    await db
      .update(courses)
      .set({ isPublished: true, updatedAt: new Date() })
      .where(eq(courses.id, courseId));
  }

  async unpublishCourse(courseId: string): Promise<void> {
    await db
      .update(courses)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(courses.id, courseId));
  }

  // ============================================================================
  // CERTIFICATE SUPPORT METHODS
  // ============================================================================

  async getLessonById(lessonId: string): Promise<any> {
    const [lesson] = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        moduleId: lessons.moduleId,
        courseId: modules.courseId,
      })
      .from(lessons)
      .leftJoin(modules, eq(lessons.moduleId, modules.id))
      .where(eq(lessons.id, lessonId))
      .limit(1);

    return lesson || null;
  }

  async getCourseLessons(courseId: string): Promise<any[]> {
    const courseModules = await db
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, courseId));

    const moduleIds = courseModules.map((m) => m.id);
    if (moduleIds.length === 0) return [];

    const allLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        moduleId: lessons.moduleId,
      })
      .from(lessons)
      .where(
        sql`${lessons.moduleId} = ANY(ARRAY[${sql.join(
          moduleIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])`,
      );

    return allLessons;
  }
}

export const storage = new DatabaseStorage();
