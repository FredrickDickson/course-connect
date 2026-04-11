/**
 * Storage Layer
 *
 * Implements all database operations for the CIMA Learning Platform.
 * Provides a clean abstraction layer over Supabase for data access.
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
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client with service role key
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

  // Course operations
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
  // Enrollment with joined course data
  getUserEnrollments(
    userId: string,
  ): Promise<(Enrollment & { course: Course })[]>;
  isUserEnrolled(userId: string, courseId: string): Promise<boolean>;
  updateEnrollmentProgress(
    userId: string,
    courseId: string,
    progress: number,
  ): Promise<void>;

  // Progress operations
  updateProgress(progress: InsertProgress): Promise<Progress>;
  // Progress with joined lesson data
  getUserProgress(
    userId: string,
    courseId: string,
  ): Promise<(Progress & { lesson: Lesson })[]>;
  getUserOverallProgress(userId: string): Promise<{
    totalCourses: number;
    completedCourses: number;
    totalHours: number;
  }>;

  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  // Review with joined user data
  getCourseReviews(
    courseId: string,
  ): Promise<
    (Review & {
      user: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        profile_image_url: string | null;
      };
    })[]
  >;
  updateCourseRating(courseId: string): Promise<void>;

  // Discussion operations
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCourseDiscussions(courseId: string): Promise<any[]>;
  // Discussion with joined author data
  getCourseDiscussions(
    courseId: string,
  ): Promise<
    (Discussion & {
      author: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        profile_image_url: string | null;
      };
      replyCount: number;
    })[]
  >;
  createReply(reply: InsertReply): Promise<Reply>;
  // Reply with joined author data
  getDiscussionReplies(
    discussionId: string,
  ): Promise<
    (Reply & {
      author: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        profile_image_url: string | null;
      };
    })[]
  >;

  // Certification operations
  createCertification(
    certification: InsertCertification,
  ): Promise<Certification>;
  // Certification with joined course data
  getUserCertifications(
    userId: string,
  ): Promise<
    (Certification & {
      course: { id: string; title: string; thumbnail_url: string | null };
    })[]
  >;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(
    id: string,
    status: string,
    paymentIntentId?: string,
  ): Promise<Order>;
  updateOrderByReference(reference: string, status: string): Promise<Order>;
  getUserOrders(userId: string): Promise<Order[]>;

  // Curriculum management operations
  getCourseModules(courseId: string): Promise<(Module & { lessons: Lesson[] })[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, updates: Partial<InsertModule>): Promise<Module>;
  deleteModule(id: string): Promise<void>;

  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;

  // Quiz operations
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuizById(id: string): Promise<Quiz | undefined>;
  getLessonQuizzes(lessonId: string): Promise<Quiz[]>;
  getCourseQuizzes(courseId: string): Promise<Quiz[]>;
  deleteQuiz(id: string): Promise<void>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer>;
  submitQuizAttempt(attempt: {
    quizId: string;
    userId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  getAssignmentByLessonId(lessonId: string): Promise<Assignment | null>;
  getLessonAssignments(lessonId: string): Promise<Assignment[]>;
  deleteAssignment(id: string): Promise<void>;
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
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return undefined;
    return data;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !data) return undefined;
    return data;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert({
        ...userData,
        email: userData.email?.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const { data: updatedUser, error } = await supabaseAdmin
      .from("users")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return updatedUser;
  }

  async updateUserPaystackInfo(
    id: string,
    customerCode: string,
  ): Promise<User> {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update({
        paystack_customer_code: customerCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async updateUserRole(
    id: string,
    role: "student" | "instructor" | "admin",
  ): Promise<User> {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return user;
  }

  async getInstructors(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("role", "instructor")
      .order("first_name")
      .order("last_name");

    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
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
    let query = supabaseAdmin
      .from("courses")
      .select(
        "*, category:categories(id, name, slug), instructor:users(first_name, last_name, profile_image_url)",
      )
      .eq("is_published", true);

    if (filters?.category && filters.category !== "all") {
      // Find category by slug or ID
      const { data: categories } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", filters.category);

      if (categories && categories.length > 0) {
        query = query.eq("category_id", categories[0].id);
      } else {
        // Try filter by ID if slug not found (handling potential UUID)
        if (filters.category.length === 36) {
          query = query.eq("category_id", filters.category);
        }
      }
    }

    if (filters?.level && filters.level !== "all") {
      query = query.eq("level", filters.level);
    }

    if (filters?.search) {
      query = query.ilike("title", `%${filters.search}%`);
    }

    if (filters?.featured !== undefined) {
      query = query.eq("is_featured", filters.featured);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  }

  async getCourseById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select(
        "*, category:categories(*), instructor:users!courses_instructor_id_fkey(*)",
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .insert(course)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCourse(
    id: string,
    updates: Partial<InsertCourse>,
  ): Promise<Course> {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCourse(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);

    if (error) throw error;
  }

  async getFeaturedCourses(): Promise<any[]> {
    return await this.getCourses({ featured: true });
  }

  async getInstructorCourses(instructorId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("*, category:categories(id, name, slug)")
      .eq("instructor_id", instructorId);

    if (error) throw error;
    return data || [];
  }

  async getInstructorStats(instructorId: string): Promise<{
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
  }> {
    // Get courses for this instructor
    const { data: instructorCourses, error: coursesError } = await supabaseAdmin
      .from("courses")
      .select("id, price, avg_rating")
      .eq("instructor_id", instructorId);

    if (coursesError) throw coursesError;
    const courseIds = (instructorCourses || []).map((c) => c.id);
    const totalCourses = (instructorCourses || []).length;

    let totalStudents = 0;
    if (courseIds.length > 0) {
      const { data: studentCount, error: studentError } = await supabaseAdmin
        .from("enrollments")
        .select("user_id", { count: "exact" })
        .in("course_id", courseIds);

      if (studentError) throw studentError;
      // Note: for distinct users, we might need a more complex query or RPC
      // but let's use exact count for now
      totalStudents = studentCount?.length || 0;
    }

    let totalRevenue = 0;
    if (courseIds.length > 0) {
      const { data: instructorOrders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select("amount")
        .in("course_id", courseIds)
        .eq("status", "completed");

      if (ordersError) throw ordersError;
      totalRevenue = (instructorOrders || []).reduce(
        (sum, order) => sum + (Number(order.amount) || 0),
        0,
      );
    }

    let averageRating = 0;
    if (instructorCourses && instructorCourses.length > 0) {
      const validRatings = instructorCourses
        .map((c) => Number(c.avg_rating))
        .filter((r) => !isNaN(r) && r > 0);

      if (validRatings.length > 0) {
        averageRating =
          validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
      }
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
    // Map camelCase to snake_case for Supabase
    const insertPayload = {
      user_id: enrollment.userId,
      course_id: enrollment.courseId,
      progress: enrollment.progress,
    };

    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserEnrollments(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("*, course:courses(*)")
      .eq("user_id", userId);

    if (error) throw error;
    return data || [];
  }

  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  async updateEnrollmentProgress(
    userId: string,
    courseId: string,
    progressValue: number,
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from("enrollments")
      .update({ progress: progressValue.toString() })
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (error) throw error;
  }

  // ============================================================================
  // PROGRESS OPERATIONS
  // ============================================================================

  async updateProgress(progressData: InsertProgress): Promise<Progress> {
    const { data, error } = await supabaseAdmin
      .from("progress")
      .upsert(
        {
          ...progressData,
          last_accessed: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUserProgress(userId: string, courseId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("progress")
      .select("*, lesson:lessons!inner(*, module:modules!inner(*))")
      .eq("user_id", userId)
      .eq("lesson.module.course_id", courseId);

    if (error) throw error;
    return data || [];
  }

  async getUserOverallProgress(userId: string): Promise<{
    totalCourses: number;
    completedCourses: number;
    totalHours: number;
  }> {
    const { data: userEnrollments, error } = await supabaseAdmin
      .from("enrollments")
      .select("progress, course:courses(duration_hours)")
      .eq("user_id", userId);

    if (error) throw error;

    const totalCourses = (userEnrollments || []).length;
    const completedCourses = (userEnrollments || []).filter(
      (e) => Number(e.progress) >= 100,
    ).length;
    const totalHours = (userEnrollments || []).reduce((sum, e: any) => {
      const course = Array.isArray(e.course) ? e.course[0] : e.course;
      return sum + (course?.duration_hours || 0);
    }, 0);

    return { totalCourses, completedCourses, totalHours };
  }

  // ============================================================================
  // REVIEW OPERATIONS
  // ============================================================================

  async createReview(review: InsertReview): Promise<Review> {
    const insertPayload = {
      user_id: review.userId,
      course_id: review.courseId,
      rating: review.rating,
      comment: review.comment,
    };
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    if (review.courseId) {
      this.updateCourseRating(review.courseId).catch(console.error);
    }
    return data;
  }

  async getCourseReviews(courseId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("*, user:users(id, first_name, last_name, profile_image_url)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async updateCourseRating(courseId: string): Promise<void> {
    const { data: reviews, error: fetchError } = await supabaseAdmin
      .from("reviews")
      .select("rating")
      .eq("course_id", courseId);
    if (fetchError || !reviews || reviews.length === 0) return;
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const ratingCount = reviews.length;
    const { error: updateError } = await supabaseAdmin
      .from("courses")
      .update({ avg_rating: avgRating.toFixed(1), rating_count: ratingCount })
      .eq("id", courseId);
    if (updateError) throw updateError;
  }

  // ============================================================================
  // DISCUSSION OPERATIONS
  // ============================================================================

  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const insertPayload = {
      user_id: discussion.userId,
      course_id: discussion.courseId,
      title: discussion.title,
      content: discussion.content,
    };
    const { data, error } = await supabaseAdmin
      .from("discussions")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getCourseDiscussions(courseId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("discussions")
      .select("*, author:users(id, first_name, last_name, profile_image_url)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const discussionsWithReplies = await Promise.all(
      (data || []).map(async (d) => {
        const { count } = await supabaseAdmin
          .from("replies")
          .select("*", { count: "exact", head: true })
          .eq("discussion_id", d.id);
        return { ...d, replyCount: count || 0 };
      }),
    );
    return discussionsWithReplies;
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const insertPayload = {
      user_id: reply.userId,
      discussion_id: reply.discussionId,
      content: reply.content,
    };
    const { data, error } = await supabaseAdmin
      .from("replies")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getDiscussionReplies(discussionId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("replies")
      .select("*, author:users(id, first_name, last_name, profile_image_url)")
      .eq("discussion_id", discussionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // CERTIFICATION OPERATIONS
  // ============================================================================

  async createCertification(
    certification: InsertCertification,
  ): Promise<Certification> {
    const insertPayload = {
      user_id: certification.userId,
      course_id: certification.courseId,
      certificate_url: certification.certificateUrl,
      valid_until: certification.validUntil,
    };
    const { data, error } = await supabaseAdmin
      .from("certifications")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getUserCertifications(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("certifications")
      .select("*, course:courses(id, title, thumbnail_url)")
      .eq("user_id", userId)
      .order("issued_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================

  async createOrder(order: InsertOrder): Promise<Order> {
    const insertPayload = {
      user_id: order.userId,
      course_id: order.courseId,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      paystack_reference: order.paystackReference,
    };
    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateOrderStatus(
    id: string,
    status: string,
    paymentIntentId?: string,
  ): Promise<Order> {
    const updateData: any = { status };
    if (paymentIntentId) {
      updateData.paystack_reference = paymentIntentId;
    }
    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateOrderByReference(
    reference: string,
    status: string,
  ): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("paystack_reference", reference)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getUserOrders(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // CURRICULUM OPERATIONS
  // ============================================================================

  async getCourseModules(courseId: string): Promise<any[]> {
    const { data: modulesData, error: modulesError } = await supabaseAdmin
      .from("modules")
      .select("*, lessons(*)")
      .eq("course_id", courseId)
      .order("order", { ascending: true });
    if (modulesError) throw modulesError;
    return (modulesData || []).map((m) => ({
      ...m,
      lessons: (m.lessons || []).sort((a: any, b: any) => a.order - b.order),
    }));
  }

  async createModule(module: InsertModule): Promise<Module> {
    const courseId = module.courseId;
    if (!courseId) throw new Error("Course ID is required for a module");
    const { data: maxOrderData } = await supabaseAdmin
      .from("modules")
      .select("order")
      .eq("course_id", courseId)
      .order("order", { ascending: false })
      .limit(1);
    const nextOrder = (maxOrderData?.[0]?.order ?? -1) + 1;
    const insertPayload = {
      course_id: courseId,
      title: module.title,
      description: module.description,
      order: nextOrder,
    };
    const { data, error } = await supabaseAdmin
      .from("modules")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateModule(
    id: string,
    updates: Partial<InsertModule>,
  ): Promise<Module> {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteModule(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from("modules").delete().eq("id", id);
    if (error) throw error;
  }

  async reorderModules(courseId: string, moduleOrder: string[]): Promise<void> {
    for (let i = 0; i < moduleOrder.length; i++) {
      await supabaseAdmin
        .from("modules")
        .update({ order: i })
        .eq("id", moduleOrder[i]);
    }
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const moduleId = lesson.moduleId;
    if (!moduleId) throw new Error("Module ID is required for a lesson");
    const { data: maxOrderData } = await supabaseAdmin
      .from("lessons")
      .select("order")
      .eq("module_id", moduleId)
      .order("order", { ascending: false })
      .limit(1);
    const nextOrder = (maxOrderData?.[0]?.order ?? -1) + 1;
    const insertPayload = {
      module_id: moduleId,
      title: lesson.title,
      description: lesson.description,
      content_type: lesson.contentType,
      video_url: lesson.videoUrl,
      duration: lesson.duration,
      content: lesson.content,
      order: nextOrder,
      is_free: lesson.isFree,
    };
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateLesson(
    id: string,
    updates: Partial<InsertLesson>,
  ): Promise<Lesson> {
    const { data, error } = await supabaseAdmin
      .from("lessons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteLesson(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from("lessons").delete().eq("id", id);
    if (error) throw error;
  }

  async reorderLessons(moduleId: string, lessonOrder: string[]): Promise<void> {
    for (let i = 0; i < lessonOrder.length; i++) {
      await supabaseAdmin
        .from("lessons")
        .update({ order: i })
        .eq("id", lessonOrder[i]);
    }
  }

  // ============================================================================
  // QUIZ OPERATIONS (Standard Interface Methods)
  // ============================================================================

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .insert(quiz)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getQuizById(id: string): Promise<Quiz | undefined> {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return data;
  }

  async getLessonQuizzes(lessonId: string): Promise<Quiz[]> {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId);
    if (error) throw error;
    return data || [];
  }

  async getCourseQuizzes(courseId: string): Promise<Quiz[]> {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select("*, lesson:lessons!inner(*)")
      .eq("lesson.module.course_id", courseId);
    if (error) throw error;
    return data || [];
  }

  async createQuizQuestion(
    question: InsertQuizQuestion,
  ): Promise<QuizQuestion> {
    const { data, error } = await supabaseAdmin
      .from("quiz_questions")
      .insert(question)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    const { data, error } = await supabaseAdmin
      .from("quiz_answers")
      .insert(answer)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async submitQuizAttempt(attempt: {
    quizId: string;
    userId: string;
    answers: any[];
    timeSpent?: number;
  }): Promise<QuizAttempt> {
    const insertData = {
      quiz_id: attempt.quizId,
      user_id: attempt.userId,
      time_spent: attempt.timeSpent || 0,
      score: "100",
      passed: true,
      completed_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("quiz_attempts")
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getQuizAttempts(
    userId: string,
    quizId: string,
  ): Promise<QuizAttempt[]> {
    const { data, error } = await supabaseAdmin
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("quiz_id", quizId)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | undefined> {
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (error || !data) return undefined;
    return data;
  }

  async recordQuizResponse(
    response: InsertQuizResponse,
  ): Promise<QuizResponse> {
    const { data, error } = await supabaseAdmin
      .from("quiz_responses")
      .insert(response)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ============================================================================
  // ASSIGNMENT OPERATIONS
  // ============================================================================

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert(assignment)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getAssignmentById(id: string): Promise<Assignment | undefined> {
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return undefined;
    return data;
  }

  async getAssignmentByLessonId(lessonId: string): Promise<Assignment | null> {
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async getLessonAssignments(lessonId: string): Promise<Assignment[]> {
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select("*")
      .eq("lesson_id", lessonId);
    if (error) throw error;
    return data || [];
  }

  async deleteAssignment(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("assignments")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  async submitAssignment(
    submission: InsertAssignmentSubmission,
  ): Promise<AssignmentSubmission> {
    const { data, error } = await supabaseAdmin
      .from("assignment_submissions")
      .insert(submission)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async gradeAssignment(
    submissionId: string,
    score: number,
    feedback: string,
    graderId: string,
  ): Promise<AssignmentSubmission> {
    const { data, error } = await supabaseAdmin
      .from("assignment_submissions")
      .update({
        score,
        feedback,
        graded_by: graderId,
        graded_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getUserAssignmentSubmissions(
    userId: string,
    assignmentId: string,
  ): Promise<AssignmentSubmission[]> {
    const { data, error } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*")
      .eq("user_id", userId)
      .eq("assignment_id", assignmentId);
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // INSTRUCTOR PAYOUT OPERATIONS
  // ============================================================================

  async createInstructorPayout(
    payout: InsertInstructorPayout,
  ): Promise<InstructorPayout> {
    const { data, error } = await supabaseAdmin
      .from("instructor_payouts")
      .insert(payout)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getInstructorPayouts(
    instructorId: string,
  ): Promise<InstructorPayout[]> {
    const { data, error } = await supabaseAdmin
      .from("instructor_payouts")
      .select("*")
      .eq("instructor_id", instructorId)
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async updatePayoutStatus(
    payoutId: string,
    status: string,
  ): Promise<InstructorPayout> {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.processed_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from("instructor_payouts")
      .update(updateData)
      .eq("id", payoutId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ============================================================================
  // INSTRUCTOR APPLICATION OPERATIONS
  // ============================================================================

  async createInstructorApplication(
    application: InsertInstructorApplication,
  ): Promise<InstructorApplication> {
    const { data, error } = await supabaseAdmin
      .from("instructor_applications")
      .insert(application)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getInstructorApplicationByUserId(
    userId: string,
  ): Promise<InstructorApplication | undefined> {
    const { data, error } = await supabaseAdmin
      .from("instructor_applications")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .maybeSingle();
    if (error || !data) return undefined;
    return data;
  }

  async getInstructorApplications(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<InstructorApplication[]> {
    let query = supabaseAdmin.from("instructor_applications").select("*");
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    query = query.order("submitted_at", { ascending: false });
    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateInstructorApplication(
    id: string,
    updates: Partial<InstructorApplication>,
  ): Promise<InstructorApplication> {
    const { data, error } = await supabaseAdmin
      .from("instructor_applications")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
    const { count: totalUsers } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true });
    const { count: totalInstructors } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "instructor");
    const { count: pendingApplications } = await supabaseAdmin
      .from("instructor_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    const { count: totalCourses } = await supabaseAdmin
      .from("courses")
      .select("*", { count: "exact", head: true });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: revenueRows } = await supabaseAdmin
      .from("orders")
      .select("amount")
      .eq("status", "completed")
      .gte("created_at", monthStart.toISOString());
    const monthlyRevenue = (revenueRows || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    const { count: activeStudents } = await supabaseAdmin
      .from("enrollments")
      .select("user_id", { count: "exact", head: true });
    return {
      totalUsers: totalUsers || 0,
      totalInstructors: totalInstructors || 0,
      pendingApplications: pendingApplications || 0,
      totalCourses: totalCourses || 0,
      monthlyRevenue,
      activeStudents: activeStudents || 0,
    };
  }

  async getUsers(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<User[]> {
    let query = supabaseAdmin.from("users").select("*");
    if (filters?.role) {
      query = query.eq("role", filters.role);
    }
    if (filters?.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
      );
    }
    query = query.order("created_at", { ascending: false });
    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getCoursesForAdmin(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    instructor?: string;
  }): Promise<Course[]> {
    let query = supabaseAdmin.from("courses").select("*");
    if (filters?.instructor) {
      query = query.eq("instructor_id", filters.instructor);
    }
    query = query.order("created_at", { ascending: false });
    if (filters?.page && filters?.limit) {
      const from = (filters.page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // COURSE RESOURCES OPERATIONS
  // ============================================================================

  async createCourseResource(
    resource: InsertCourseResource,
  ): Promise<CourseResource> {
    // Map camelCase to snake_case for Supabase
    const insertPayload = {
      lesson_id: resource.lessonId,
      course_id: resource.courseId,
      title: resource.title,
      description: resource.description,
      file_url: resource.fileUrl,
      file_name: resource.fileName,
      file_type: resource.fileType,
      file_size: resource.fileSize,
      download_count: resource.downloadCount,
    };

    const { data, error } = await supabaseAdmin
      .from("course_resources")
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLessonResources(lessonId: string): Promise<CourseResource[]> {
    const { data, error } = await supabaseAdmin
      .from("course_resources")
      .select("*")
      .eq("lesson_id", lessonId);
    if (error) throw error;
    return data || [];
  }

  async getCourseResources(courseId: string): Promise<CourseResource[]> {
    const { data, error } = await supabaseAdmin
      .from("course_resources")
      .select("*")
      .eq("course_id", courseId);
    if (error) throw error;
    return data || [];
  }

  async deleteCourseResource(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("course_resources")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  // ============================================================================
  // QUIZ AND ASSIGNMENT OPERATIONS
  // ============================================================================

  async createOrUpdateQuiz(lessonId: string, quizData: any) {
    // Check if quiz already exists for this lesson
    const { data: existing } = await supabaseAdmin
      .from("quizzes")
      .select("id")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    const quizPayload = {
      lesson_id: lessonId,
      title: quizData.title,
      description: quizData.description,
      passing_score: quizData.passingScore,
      time_limit: quizData.timeLimit,
      max_attempts: quizData.maxAttempts,
      is_required: quizData.isRequired ?? false,
    };

    let quizId: string;
    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from("quizzes")
        .update(quizPayload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      quizId = updated.id;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("quizzes")
        .insert(quizPayload)
        .select()
        .single();
      if (error) throw error;
      quizId = created.id;
    }

    // Upsert questions and answers if provided
    if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      // Delete existing questions (cascade should remove responses/answers)
      await supabaseAdmin.from("quiz_questions").delete().eq("quiz_id", quizId);

      for (let i = 0; i < quizData.questions.length; i++) {
        const q = quizData.questions[i];
        const { data: question, error: qError } = await supabaseAdmin
          .from("quiz_questions")
          .insert({
            quiz_id: quizId,
            question: q.question,
            question_type: q.questionType || "multiple_choice",
            points: q.points ?? 1,
            order: i,
          })
          .select()
          .single();

        if (qError) throw qError;

        if (Array.isArray(q.answers)) {
          const answersPayload = q.answers.map((a: any, j: number) => ({
            question_id: question.id,
            answer: a.answer,
            is_correct: a.isCorrect ?? false,
            order: j,
          }));
          await supabaseAdmin.from("quiz_answers").insert(answersPayload);
        }
      }
    }

    return await this.getQuizWithQuestions(quizId);
  }

  // Fetch quiz with all questions and answers (answers shuffled, isCorrect hidden for students)
  async getQuizWithQuestions(quizId: string, hideCorrect = false) {
    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .select("*, questions:quiz_questions(*, answers:quiz_answers(*))")
      .eq("id", quizId)
      .single();

    if (error || !quiz) return null;

    // Supabase returns nested relations. We might need to sort them as they may not be sorted by 'order'
    const sortedQuestions = (quiz.questions || [])
      .sort((a: any, b: any) => a.order - b.order)
      .map((q: any) => ({
        ...q,
        answers: (q.answers || [])
          .sort((a: any, b: any) => a.order - b.order)
          .map((a: any) => {
            if (hideCorrect) {
              const { is_correct: _, ...rest } = a;
              return rest;
            }
            return a;
          }),
      }));

    return { ...quiz, questions: sortedQuestions };
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("quizzes")
      .delete()
      .eq("id", quizId);
    if (error) throw error;
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
        isCorrect = (answer?.is_correct as boolean | null) ?? false;
      }

      if (isCorrect) earnedPoints += question.points ?? 1;

      await supabaseAdmin.from("quiz_responses").insert({
        attempt_id: attemptId,
        question_id: resp.questionId,
        answer_id: resp.answerId || null,
        response_text: resp.responseText || null,
        is_correct: isCorrect,
        points_earned: isCorrect ? (question.points ?? 1) : 0,
      });
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= (quiz.passing_score ?? 80);

    const { data: attempt, error } = await supabaseAdmin
      .from("quiz_attempts")
      .update({
        score,
        passed,
        completed_at: new Date().toISOString(),
        time_spent: timeSpent,
      })
      .eq("id", attemptId)
      .select()
      .single();

    if (error) throw error;
    return attempt;
  }

  // ── Real data methods for previously-mocked routes ───────────────────────

  async getRealPlatformStats(): Promise<{
    totalCourses: number;
    totalStudents: number;
    averageRating: number;
    totalHours: number;
  }> {
    const { count: totalCourses } = await supabaseAdmin
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true);

    const { count: totalStudents } = await supabaseAdmin
      .from("enrollments")
      .select("*", { count: "exact", head: true });

    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("rating");
    const avgRating = reviews?.length
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    const { data: coursesData } = await supabaseAdmin
      .from("courses")
      .select("duration_hours")
      .eq("is_published", true);
    const totalHours =
      coursesData?.reduce((sum, c) => sum + (c.duration_hours || 0), 0) || 0;

    return {
      totalCourses: totalCourses || 0,
      totalStudents: totalStudents || 0,
      averageRating: Math.round(avgRating * 10) / 10,
      totalHours,
    };
  }

  async getInstructorMonthlyRevenue(
    instructorId: string,
  ): Promise<{ month: string; amount: number }[]> {
    const { data: coursesData, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("instructor_id", instructorId);

    if (courseError) throw courseError;
    const courseIds = coursesData?.map((c) => c.id) || [];
    if (courseIds.length === 0) return [];

    const { data: ordersData, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("amount, created_at")
      .eq("status", "completed")
      .in("course_id", courseIds);

    if (orderError) throw orderError;

    // Group by month in memory
    const monthData: Record<string, number> = {};
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    ordersData?.forEach((order) => {
      if (order.created_at) {
        const date = new Date(order.created_at);
        const monthKey = months[date.getMonth()];
        monthData[monthKey] =
          (monthData[monthKey] || 0) + (Number(order.amount) || 0);
      }
    });

    return Object.entries(monthData).map(([month, amount]) => ({
      month,
      amount,
    }));
  }

  async getInstructorAnalytics(instructorId: string): Promise<any[]> {
    const { data: coursesData, error } = await supabaseAdmin
      .from("courses")
      .select(
        `
        id,
        title,
        price,
        avg_rating,
        rating_count,
        enrollment_count,
        orders (amount, status)
      `,
      )
      .eq("instructor_id", instructorId);

    if (error) throw error;

    return (coursesData || []).map((course) => {
      const completedOrders = (course.orders || []).filter(
        (o: any) => o.status === "completed",
      );
      const revenue = completedOrders.reduce(
        (sum: number, o: any) => sum + (Number(o.amount) || 0),
        0,
      );

      return {
        id: course.id,
        title: course.title,
        price: Number(course.price),
        revenue,
        students: course.enrollment_count || 0,
        rating: Number(course.avg_rating) || 0,
        ratingCount: course.rating_count || 0,
      };
    });
  }

  async getInstructorPendingSubmissions(instructorId: string): Promise<any[]> {
    const { data: coursesData, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("instructor_id", instructorId);

    if (courseError) throw courseError;
    const courseIds = (coursesData || []).map((c) => c.id);
    if (courseIds.length === 0) return [];

    const { data: submissions, error } = await supabaseAdmin
      .from("assignment_submissions")
      .select(
        `
        *,
        assignment:assignments!inner(
          id,
          title,
          lesson:lessons!inner(
            id,
            title,
            module:modules!inner(
              id,
              title,
              course_id
            )
          )
        ),
        user:users(id, first_name, last_name, profile_image_url)
      `,
      )
      .is("graded_at", null)
      .in("assignment.lesson.module.course_id", courseIds)
      .order("submitted_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return (submissions || []).map((s) => {
      const assignment = Array.isArray(s.assignment)
        ? s.assignment[0]
        : s.assignment;
      const user = Array.isArray(s.user) ? s.user[0] : s.user;
      return {
        id: s.id,
        assignment: { title: assignment?.title },
        student: { firstName: user?.first_name, lastName: user?.last_name },
        submittedAt: s.submitted_at,
      };
    });
  }

  async getInstructorStudentQuestions(instructorId: string): Promise<any[]> {
    const { data: coursesData, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("id, title")
      .eq("instructor_id", instructorId);

    if (courseError) throw courseError;
    const courseIds = (coursesData || []).map((c) => c.id);
    if (courseIds.length === 0) return [];

    const { data: discussions, error } = await supabaseAdmin
      .from("discussions")
      .select(
        `
        *,
        user:users(id, first_name, last_name, profile_image_url)
      `,
      )
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return (discussions || []).map((d) => {
      const user = Array.isArray(d.user) ? d.user[0] : d.user;
      return {
        id: d.id,
        content: d.content,
        student: { firstName: user?.first_name, lastName: user?.last_name },
        course: {
          title:
            coursesData.find((c) => c.id === d.course_id)?.title ||
            "Unknown Course",
        },
        createdAt: d.created_at,
      };
    });
  }

  async getStudentPendingAssignments(userId: string): Promise<any[]> {
    const { data: enrollmentsData, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);

    if (enrollError) throw enrollError;
    const courseIds = (enrollmentsData || []).map((e) => e.course_id);
    if (courseIds.length === 0) return [];

    const { data: assignmentsData, error } = await supabaseAdmin
      .from("assignments")
      .select(
        `
        *,
        lesson:lessons!inner(
          module:modules!inner(
            course_id,
            course:courses(title)
          )
        )
      `,
      )
      .in("lesson.module.course_id", courseIds);

    if (error) throw error;

    // Filter out submitted assignments
    const { data: submissions } = await supabaseAdmin
      .from("assignment_submissions")
      .select("assignment_id")
      .eq("user_id", userId);

    const submittedIds = new Set(
      submissions?.map((s) => s.assignment_id) || [],
    );

    return (assignmentsData || [])
      .filter((a) => !submittedIds.has(a.id))
      .map((a) => {
        const course = Array.isArray(a.lesson?.module?.course)
          ? a.lesson.module.course[0]
          : a.lesson?.module?.course;
        return {
          id: a.id,
          title: a.title,
          course: { title: course?.title },
          dueDate: a.due_date,
          submissionStatus: "pending",
        };
      });
  }

  async getStudentPendingQuizzes(userId: string): Promise<any[]> {
    const { data: enrollmentsData, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);

    if (enrollError) throw enrollError;
    const courseIds = (enrollmentsData || []).map((e) => e.course_id);
    if (courseIds.length === 0) return [];

    const { data: quizzesData, error } = await supabaseAdmin
      .from("quizzes")
      .select(
        `
        *,
        lesson:lessons!inner(
          module:modules!inner(
            course_id,
            course:courses(title)
          )
        ),
        quiz_questions(id)
      `,
      )
      .in("lesson.module.course_id", courseIds);

    if (error) throw error;

    // Filter out completed quizzes
    const { data: attempts } = await supabaseAdmin
      .from("quiz_attempts")
      .select("quiz_id")
      .eq("user_id", userId)
      .not("completed_at", "is", null);

    const completedQuizIds = new Set(attempts?.map((a) => a.quiz_id) || []);

    return (quizzesData || [])
      .filter((q) => !completedQuizIds.has(q.id))
      .map((q) => {
        const course = Array.isArray(q.lesson?.module?.course)
          ? q.lesson.module.course[0]
          : q.lesson?.module?.course;
        return {
          id: q.id,
          title: q.title,
          course: { title: course?.title },
          questionCount: q.quiz_questions?.length || 0,
          timeLimit: q.time_limit,
        };
      });
  }

  async getCourseRecommendations(userId: string): Promise<any[]> {
    const { data: enrolled, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);

    if (enrollError) throw enrollError;
    const enrolledIds = (enrolled || [])
      .map((e) => e.course_id)
      .filter(Boolean) as string[];

    let categoryIds: string[] = [];
    if (enrolledIds.length > 0) {
      const { data: courseCats } = await supabaseAdmin
        .from("courses")
        .select("category_id")
        .in("id", enrolledIds);
      categoryIds = Array.from(
        new Set(
          (courseCats || [])
            .map((c) => c.category_id)
            .filter(Boolean) as string[],
        ),
      );
    }

    let query = supabaseAdmin
      .from("courses")
      .select("*")
      .eq("is_published", true);
    if (enrolledIds.length > 0) {
      query = query.not("id", "in", `(${enrolledIds.join(",")})`);
    }

    if (categoryIds.length > 0) {
      query = query.in("category_id", categoryIds);
    }

    const { data: recommended, error } = await query
      .order("avg_rating", { ascending: false })
      .order("enrollment_count", { ascending: false })
      .limit(6);

    if (error) throw error;
    return (recommended || []).map((c) => ({
      id: c.id,
      title: c.title,
      thumbnailUrl: c.thumbnail_url,
      avgRating: c.avg_rating,
      enrollmentCount: c.enrollment_count,
    }));
  }

  async getStudentDownloadableResources(userId: string): Promise<any[]> {
    const { data: enrolled, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("course_id")
      .eq("user_id", userId);

    if (enrollError) throw enrollError;
    const courseIds = (enrolled || [])
      .map((e) => e.course_id)
      .filter(Boolean) as string[];
    if (courseIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from("course_resources")
      .select("*")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  async createOrUpdateAssignment(lessonId: string, assignmentData: any) {
    const assignmentPayload = {
      lesson_id: lessonId,
      title: assignmentData.title,
      description: assignmentData.description,
      instructions: assignmentData.instructions ?? null,
      max_score: assignmentData.maxScore ?? assignmentData.maxPoints ?? 100,
      due_date: assignmentData.dueDate
        ? new Date(assignmentData.dueDate).toISOString()
        : null,
      allow_late_submission: assignmentData.allowLateSubmission ?? true,
      is_required: assignmentData.isRequired ?? false,
    };

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .upsert(assignmentPayload, { onConflict: "lesson_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ============================================================================
  // COURSE PUBLISHING OPERATIONS
  // ============================================================================

  async validateCourseForPublishing(courseId: string): Promise<{
    isValid: boolean;
    checks: Record<string, boolean>;
    errors: string[];
  }> {
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    const { data: courseModules } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("course_id", courseId);

    const { data: totalLessons } = await supabaseAdmin
      .from("lessons")
      .select("*, module:modules!inner(course_id)")
      .eq("module.course_id", courseId);

    const videoLessons = (totalLessons || []).filter(
      (lesson) => lesson.content_type === "video",
    );

    const checks = {
      hasTitle: !!course.title && course.title.trim().length > 0,
      hasDescription:
        !!course.description && course.description.trim().length > 0,
      hasPrice: course.price !== null && course.price !== undefined,
      hasCategory: !!course.category_id,
      hasThumbnail: !!course.thumbnail_url,
      hasModules: (courseModules || []).length > 0,
      hasLectures: (totalLessons || []).length > 0,
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
    const { error } = await supabaseAdmin
      .from("courses")
      .update({ is_published: true, updated_at: new Date().toISOString() })
      .eq("id", courseId);
    if (error) throw error;
  }

  async unpublishCourse(courseId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("courses")
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq("id", courseId);
    if (error) throw error;
  }

  // ============================================================================
  // CERTIFICATE SUPPORT METHODS
  // ============================================================================

  async getLessonById(lessonId: string): Promise<any> {
    const { data: lesson, error } = await supabaseAdmin
      .from("lessons")
      .select("id, title, module_id, module:modules!inner(course_id)")
      .eq("id", lessonId)
      .maybeSingle();

    if (error) throw error;
    if (!lesson) return null;

    const moduleData = Array.isArray(lesson.module)
      ? lesson.module[0]
      : lesson.module;

    return {
      id: lesson.id,
      title: lesson.title,
      moduleId: lesson.module_id,
      courseId: moduleData?.course_id,
    };
  }

  async getCourseLessons(courseId: string): Promise<any[]> {
    const { data: courseModules, error: moduleError } = await supabaseAdmin
      .from("modules")
      .select("id")
      .eq("course_id", courseId);

    if (moduleError) throw moduleError;
    const moduleIds = (courseModules || []).map((m) => m.id);
    if (moduleIds.length === 0) return [];

    const { data: allLessons, error } = await supabaseAdmin
      .from("lessons")
      .select("id, title, module_id")
      .in("module_id", moduleIds);

    if (error) throw error;
    return (allLessons || []).map((l) => ({
      id: l.id,
      title: l.title,
      moduleId: l.module_id,
    }));
  }
}

export const storage = new DatabaseStorage();
