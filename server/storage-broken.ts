// @ts-nocheck
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
  quizzes,
  quizQuestions,
  quizAnswers,
  quizAttempts,
  quizResponses,
  assignments,
  assignmentSubmissions,
  instructorPayouts,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, like, sql, avg, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPaystackInfo(id: string, customerCode: string): Promise<User>;
  updateUserRole(id: string, role: 'student' | 'instructor' | 'admin'): Promise<User>;
  getInstructors(): Promise<User[]>;

  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Course operations
  getCourses(filters?: { category?: string; search?: string; level?: string; featured?: boolean }): Promise<(Course & { instructor: User; category: Category })[]>;
  getCourseById(id: string): Promise<(Course & { instructor: User; category: Category; modules: (Module & { lessons: Lesson[] })[] }) | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getFeaturedCourses(): Promise<(Course & { instructor: User; category: Category })[]>;
  getInstructorCourses(instructorId: string): Promise<(Course & { category: Category })[]>;
  getInstructorStats(instructorId: string): Promise<{ totalCourses: number; totalStudents: number; totalRevenue: number; averageRating: number }>;

  // Enrollment operations
  enrollUser(enrollment: InsertEnrollment): Promise<Enrollment>;
  getUserEnrollments(userId: string): Promise<(Enrollment & { course: Course & { instructor: User } })[]>;
  isUserEnrolled(userId: string, courseId: string): Promise<boolean>;
  updateEnrollmentProgress(userId: string, courseId: string, progress: number): Promise<void>;

  // Progress operations
  updateProgress(progress: InsertProgress): Promise<Progress>;
  getUserProgress(userId: string, courseId: string): Promise<(Progress & { lesson: Lesson })[]>;
  getUserOverallProgress(userId: string): Promise<{ totalCourses: number; completedCourses: number; totalHours: number }>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getCourseReviews(courseId: string): Promise<(Review & { user: User })[]>;
  updateCourseRating(courseId: string): Promise<void>;

  // Discussion operations
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  getCourseDiscussions(courseId: string): Promise<(Discussion & { user: User; _count: { replies: number } })[]>;
  createReply(reply: InsertReply): Promise<Reply>;
  getDiscussionReplies(discussionId: string): Promise<(Reply & { user: User })[]>;

  // Certification operations
  createCertification(certification: InsertCertification): Promise<Certification>;
  getUserCertifications(userId: string): Promise<(Certification & { course: Course })[]>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, paymentIntentId?: string): Promise<Order>;
  updateOrderByReference(reference: string, status: string): Promise<Order>;
  getUserOrders(userId: string): Promise<(Order & { course: Course })[]>;

  // Quiz operations
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuizById(id: string): Promise<Quiz | undefined>;
  getLessonQuizzes(lessonId: string): Promise<Quiz[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer>;
  submitQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  recordQuizResponse(response: InsertQuizResponse): Promise<QuizResponse>;
  getUserQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentById(id: string): Promise<Assignment | undefined>;
  getLessonAssignments(lessonId: string): Promise<Assignment[]>;
  submitAssignment(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission>;
  gradeAssignment(submissionId: string, score: number, feedback: string, graderId: string): Promise<AssignmentSubmission>;
  getUserAssignmentSubmissions(userId: string, assignmentId: string): Promise<AssignmentSubmission[]>;

  // Instructor payout operations
  createInstructorPayout(payout: InsertInstructorPayout): Promise<InstructorPayout>;
  getInstructorPayouts(instructorId: string): Promise<InstructorPayout[]>;
  updatePayoutStatus(payoutId: string, status: string): Promise<InstructorPayout>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPaystackInfo(id: string, customerCode: string): Promise<User> {
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

  async updateUserRole(id: string, role: 'student' | 'instructor' | 'admin'): Promise<User> {
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
      .where(eq(users.role, 'instructor'))
      .orderBy(users.firstName, users.lastName);
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Course operations
  async getCourses(filters?: { category?: string; search?: string; level?: string; featured?: boolean }): Promise<(Course & { instructor: User; category: Category })[]> {
    const conditions = [eq(courses.isPublished, true)];
    
    if (filters?.category) {
      conditions.push(eq(categories.slug, filters.category));
    }
    
    if (filters?.search) {
      conditions.push(like(courses.title, `%${filters.search}%`));
    }
    
    if (filters?.level) {
      conditions.push(eq(courses.level, filters.level));
    }
    
    if (filters?.featured) {
      conditions.push(eq(courses.isFeatured, true));
    }

    const results = await db
      .select()
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(courses.createdAt));

    return results.map(row => ({
      ...row.courses,
      instructor: row.users!,
      category: row.categories!,
    }));
  }

  async getCourseById(id: string): Promise<(Course & { instructor: User; category: Category; modules: (Module & { lessons: Lesson[] })[] }) | undefined> {
    const courseResults = await db
      .select()
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(eq(courses.id, id))
      .limit(1);

    if (courseResults.length === 0) return undefined;

    const courseRow = courseResults[0];
    const course = {
      ...courseRow.courses,
      instructor: courseRow.users!,
      category: courseRow.categories!,
    };

    const courseModules = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, id))
      .orderBy(modules.order);

    const modulesWithLessons = await Promise.all(
      courseModules.map(async (module) => {
        const moduleLessons = await db
          .select()
          .from(lessons)
          .where(eq(lessons.moduleId, module.id))
          .orderBy(lessons.order);

        return {
          ...module,
          lessons: moduleLessons,
        };
      })
    );

    return {
      ...course,
      modules: modulesWithLessons,
    };
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(id: string, updates: Partial<InsertCourse>): Promise<Course> {
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

  async getFeaturedCourses(): Promise<(Course & { instructor: User; category: Category })[]> {
    const results = await db
      .select()
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(and(eq(courses.isPublished, true), eq(courses.isFeatured, true)))
      .orderBy(desc(courses.createdAt));

    return results.map(row => ({
      ...row.courses,
      instructor: row.users!,
      category: row.categories!,
    }));
  }

  // Enrollment operations
  async enrollUser(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    
    // Update enrollment count
    await db
      .update(courses)
      .set({
        enrollmentCount: sql`${courses.enrollmentCount} + 1`,
      })
      .where(eq(courses.id, enrollment.courseId));

    return newEnrollment;
  }

  async getUserEnrollments(userId: string): Promise<(Enrollment & { course: Course & { instructor: User } })[]> {
    return await db
      .select({
        ...enrollments,
        course: {
          ...courses,
          instructor: users,
        },
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));
  }

  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
    return !!enrollment;
  }

  async updateEnrollmentProgress(userId: string, courseId: string, progress: number): Promise<void> {
    await db
      .update(enrollments)
      .set({ progress: progress.toString() })
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
  }

  // Progress operations
  async updateProgress(progressData: InsertProgress): Promise<Progress> {
    const [existingProgress] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, progressData.userId), eq(progress.lessonId, progressData.lessonId)));

    if (existingProgress) {
      const [updatedProgress] = await db
        .update(progress)
        .set({ ...progressData, lastWatchedAt: new Date() })
        .where(and(eq(progress.userId, progressData.userId), eq(progress.lessonId, progressData.lessonId)))
        .returning();
      return updatedProgress;
    } else {
      const [newProgress] = await db.insert(progress).values(progressData).returning();
      return newProgress;
    }
  }

  async getUserProgress(userId: string, courseId: string): Promise<(Progress & { lesson: Lesson })[]> {
    return await db
      .select({
        ...progress,
        lesson: lessons,
      })
      .from(progress)
      .leftJoin(lessons, eq(progress.lessonId, lessons.id))
      .leftJoin(modules, eq(lessons.moduleId, modules.id))
      .where(and(eq(progress.userId, userId), eq(modules.courseId, courseId)))
      .orderBy(modules.order, lessons.order);
  }

  async getUserOverallProgress(userId: string): Promise<{ totalCourses: number; completedCourses: number; totalHours: number }> {
    const enrollmentStats = await db
      .select({
        totalCourses: count(),
        completedCourses: sql<number>`COUNT(CASE WHEN ${enrollments.progress} = '100' THEN 1 END)`,
        totalHours: sql<number>`SUM(COALESCE(${courses.duration}, 0))`,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, userId));

    return enrollmentStats[0] || { totalCourses: 0, completedCourses: 0, totalHours: 0 };
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    await this.updateCourseRating(review.courseId);
    return newReview;
  }

  async getCourseReviews(courseId: string): Promise<(Review & { user: User })[]> {
    return await db
      .select({
        ...reviews,
        user: users,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.courseId, courseId))
      .orderBy(desc(reviews.createdAt));
  }

  async updateCourseRating(courseId: string): Promise<void> {
    const [stats] = await db
      .select({
        avgRating: avg(reviews.rating),
        count: count(),
      })
      .from(reviews)
      .where(eq(reviews.courseId, courseId));

    await db
      .update(courses)
      .set({
        avgRating: stats.avgRating?.toString() || '0',
        ratingCount: stats.count || 0,
      })
      .where(eq(courses.id, courseId));
  }

  // Discussion operations
  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const [newDiscussion] = await db.insert(discussions).values(discussion).returning();
    return newDiscussion;
  }

  async getCourseDiscussions(courseId: string): Promise<(Discussion & { user: User; _count: { replies: number } })[]> {
    const discussionsList = await db
      .select({
        ...discussions,
        user: users,
      })
      .from(discussions)
      .leftJoin(users, eq(discussions.userId, users.id))
      .where(eq(discussions.courseId, courseId))
      .orderBy(desc(discussions.createdAt));

    // Get reply counts for each discussion
    const discussionsWithCounts = await Promise.all(
      discussionsList.map(async (discussion) => {
        const [replyCount] = await db
          .select({ count: count() })
          .from(replies)
          .where(eq(replies.discussionId, discussion.id));

        return {
          ...discussion,
          _count: { replies: replyCount.count || 0 },
        };
      })
    );

    return discussionsWithCounts;
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const [newReply] = await db.insert(replies).values(reply).returning();
    return newReply;
  }

  async getDiscussionReplies(discussionId: string): Promise<(Reply & { user: User })[]> {
    return await db
      .select({
        ...replies,
        user: users,
      })
      .from(replies)
      .leftJoin(users, eq(replies.userId, users.id))
      .where(eq(replies.discussionId, discussionId))
      .orderBy(replies.createdAt);
  }

  // Certification operations
  async createCertification(certification: InsertCertification): Promise<Certification> {
    const [newCertification] = await db.insert(certifications).values(certification).returning();
    return newCertification;
  }

  async getUserCertifications(userId: string): Promise<(Certification & { course: Course })[]> {
    return await db
      .select({
        ...certifications,
        course: courses,
      })
      .from(certifications)
      .leftJoin(courses, eq(certifications.courseId, courses.id))
      .where(eq(certifications.userId, userId))
      .orderBy(desc(certifications.issuedAt));
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string, paymentIntentId?: string): Promise<Order> {
    const updateData: any = { status };
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

  async updateOrderByReference(reference: string, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.paystackReference, reference))
      .returning();
    return updatedOrder;
  }

  async getUserOrders(userId: string): Promise<(Order & { course: Course })[]> {
    return await db
      .select({
        ...orders,
        course: courses,
      })
      .from(orders)
      .leftJoin(courses, eq(orders.courseId, courses.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  // Instructor-specific methods
  async getInstructorCourses(instructorId: string): Promise<(Course & { category: Category })[]> {
    return await db
      .select({
        ...courses,
        category: categories,
      })
      .from(courses)
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.createdAt));
  }

  async getInstructorStats(instructorId: string): Promise<{ totalCourses: number; totalStudents: number; totalRevenue: number; averageRating: number }> {
    // Get total courses
    const [courseStats] = await db
      .select({
        totalCourses: count(courses.id),
        averageRating: avg(courses.avgRating),
      })
      .from(courses)
      .where(eq(courses.instructorId, instructorId));

    // Get total students
    const [studentStats] = await db
      .select({
        totalStudents: count(enrollments.id),
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(courses.instructorId, instructorId));

    // Get total revenue
    const [revenueStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${orders.amount}), 0)`,
      })
      .from(orders)
      .leftJoin(courses, eq(orders.courseId, courses.id))
      .where(and(
        eq(courses.instructorId, instructorId),
        eq(orders.status, 'completed')
      ));

    return {
      totalCourses: Number(courseStats?.totalCourses || 0),
      totalStudents: Number(studentStats?.totalStudents || 0),
      totalRevenue: Number(revenueStats?.totalRevenue || 0),
      averageRating: Number(courseStats?.averageRating || 0),
    };
  }

  // Quiz operations
  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async getQuizById(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getLessonQuizzes(lessonId: string): Promise<Quiz[]> {
    return await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).orderBy(quizzes.createdAt);
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(quizQuestions).values(question).returning();
    return newQuestion;
  }

  async createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    const [newAnswer] = await db.insert(quizAnswers).values(answer).returning();
    return newAnswer;
  }

  async submitQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async recordQuizResponse(response: InsertQuizResponse): Promise<QuizResponse> {
    const [newResponse] = await db.insert(quizResponses).values(response).returning();
    return newResponse;
  }

  async getUserQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
      .orderBy(desc(quizAttempts.startedAt));
  }

  // Assignment operations
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async getAssignmentById(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async getLessonAssignments(lessonId: string): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.lessonId, lessonId)).orderBy(assignments.createdAt);
  }

  async submitAssignment(submission: InsertAssignmentSubmission): Promise<AssignmentSubmission> {
    const [newSubmission] = await db.insert(assignmentSubmissions).values(submission).returning();
    return newSubmission;
  }

  async gradeAssignment(submissionId: string, score: number, feedback: string, graderId: string): Promise<AssignmentSubmission> {
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

  async getUserAssignmentSubmissions(userId: string, assignmentId: string): Promise<AssignmentSubmission[]> {
    return await db
      .select()
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.userId, userId), eq(assignmentSubmissions.assignmentId, assignmentId)))
      .orderBy(desc(assignmentSubmissions.submittedAt));
  }

  // Instructor payout operations
  async createInstructorPayout(payout: InsertInstructorPayout): Promise<InstructorPayout> {
    const [newPayout] = await db.insert(instructorPayouts).values(payout).returning();
    return newPayout;
  }

  async getInstructorPayouts(instructorId: string): Promise<InstructorPayout[]> {
    return await db
      .select()
      .from(instructorPayouts)
      .where(eq(instructorPayouts.instructorId, instructorId))
      .orderBy(desc(instructorPayouts.createdAt));
  }

  async updatePayoutStatus(payoutId: string, status: string): Promise<InstructorPayout> {
    const [updatedPayout] = await db
      .update(instructorPayouts)
      .set({
        status: status as any,
        processedAt: status === 'completed' ? new Date() : undefined,
      })
      .where(eq(instructorPayouts.id, payoutId))
      .returning();
    return updatedPayout;
  }
}

export const storage = new DatabaseStorage();
