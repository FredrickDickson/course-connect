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

// Initialize Supabase Admin client with service role key for backend operations
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  deleteQuiz(id: string): Promise<void>;
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
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !data) return undefined;
    return data;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
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
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      .from('users')
      .update({
        paystack_customer_code: customerCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
      .from('users')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return user;
  }

  async getInstructors(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'instructor')
      .order('first_name')
      .order('last_name');
    
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // CATEGORY OPERATIONS
  // ============================================================================

  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const { data, error } = await supabaseAdmin
      .from('categories')
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
      .from('courses')
      .select('*, category:categories(id, name, slug), instructor:users(first_name, last_name, profile_image_url)')
      .eq('is_published', true);

    if (filters?.category && filters.category !== "all") {
      // Find category by slug or ID
      const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('slug', filters.category);
      
      if (categories && categories.length > 0) {
        query = query.eq('category_id', categories[0].id);
      } else {
        // Try filter by ID if slug not found (handling potential UUID)
        if (filters.category.length === 36) {
          query = query.eq('category_id', filters.category);
        }
      }
    }

    if (filters?.level && filters.level !== "all") {
      query = query.eq('level', filters.level);
    }

    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    if (filters?.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getCourseById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*, category:categories(*), instructor:users!courses_instructor_id_fkey(*)')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const { data, error } = await supabaseAdmin
      .from('courses')
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
      .from('courses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCourse(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getFeaturedCourses(): Promise<any[]> {
    return await this.getCourses({ featured: true });
  }

  async getInstructorCourses(instructorId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*, category:categories(id, name, slug)')
      .eq('instructor_id', instructorId);
    
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
      .from('courses')
      .select('id, price, avg_rating')
      .eq('instructor_id', instructorId);
    
    if (coursesError) throw coursesError;
    const courseIds = (instructorCourses || []).map((c) => c.id);
    const totalCourses = (instructorCourses || []).length;

    let totalStudents = 0;
    if (courseIds.length > 0) {
      const { data: studentCount, error: studentError } = await supabaseAdmin
        .from('enrollments')
        .select('user_id', { count: 'exact' })
        .in('course_id', courseIds);
      
      if (studentError) throw studentError;
      // Note: for distinct users, we might need a more complex query or RPC
      // but let's use exact count for now
      totalStudents = studentCount?.length || 0;
    }

    let totalRevenue = 0;
    if (courseIds.length > 0) {
      const { data: instructorOrders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('amount')
        .in('course_id', courseIds)
        .eq('status', 'completed');
      
      if (ordersError) throw ordersError;
      totalRevenue = (instructorOrders || []).reduce(
        (sum, order) => sum + (Number(order.amount) || 0),
        0,
      );
    }

    let averageRating = 0;
    if (instructorCourses && instructorCourses.length > 0) {
      const validRatings = instructorCourses
        .map(c => Number(c.avg_rating))
        .filter(r => !isNaN(r) && r > 0);
      
      if (validRatings.length > 0) {
        averageRating = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
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
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .insert(enrollment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserEnrollments(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  }

  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
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
      .from('enrollments')
      .update({ progress: progressValue.toString() })
      .eq('user_id', userId)
      .eq('course_id', courseId);
    
    if (error) throw error;
  }

  // ============================================================================
  // PROGRESS OPERATIONS
  // ============================================================================

  async updateProgress(progressData: InsertProgress): Promise<Progress> {
    const { data, error } = await supabaseAdmin
      .from('progress')
      .upsert({
        ...progressData,
        last_accessed: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserProgress(userId: string, courseId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('progress')
      .select('*, lesson:lessons!inner(*, module:modules!inner(*))')
      .eq('user_id', userId)
      .eq('lesson.module.course_id', courseId);
    
    if (error) throw error;
    return data || [];
  }

  async getUserOverallProgress(userId: string): Promise<{
    totalCourses: number;
    completedCourses: number;
    totalHours: number;
  }> {
    const { data: userEnrollments, error } = await supabaseAdmin
      .from('enrollments')
      .select('progress, course:courses(duration_hours)')
      .eq('user_id', userId);

    if (error) throw error;

    const totalCourses = (userEnrollments || []).length;
    const completedCourses = (userEnrollments || []).filter(
      (e) => Number(e.progress) >= 100,
    ).length;
    const totalHours = (userEnrollments || []).reduce(
      (sum, e) => sum + (e.course?.duration_hours || 0),
      0,
    );

    return { totalCourses, completedCourses, totalHours };
  }

  // ============================================================================
  // REVIEW OPERATIONS
  // ============================================================================

  async createReview(review: InsertReview): Promise<Review> {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert(review)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update course rating asychronously
    if (review.courseId) {
      this.updateCourseRating(review.courseId).catch(console.error);
    }

    return data;
  }

  async getCourseReviews(courseId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, user:users(id, first_name, last_name, profile_image_url)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async updateCourseRating(courseId: string): Promise<void> {
    const { data: reviews, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('course_id', courseId);
    
    if (fetchError || !reviews || reviews.length === 0) return;

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const ratingCount = reviews.length;

    const { error: updateError } = await supabaseAdmin
      .from('courses')
      .update({
        avg_rating: avgRating.toFixed(1),
        rating_count: ratingCount
      })
      .eq('id', courseId);
    
    if (updateError) throw updateError;
  }

  // ============================================================================
  // DISCUSSION OPERATIONS
  // ============================================================================

  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const { data, error } = await supabaseAdmin
      .from('discussions')
      .insert(discussion)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getCourseDiscussions(courseId: string): Promise<any[]> {
    // Note: replyCount might need a complex join or separate query
    const { data, error } = await supabaseAdmin
      .from('discussions')
      .select('*, author:users(id, first_name, last_name, profile_image_url)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Enrich with reply counts
    const discussionsWithReplies = await Promise.all((data || []).map(async (d) => {
      const { count } = await supabaseAdmin
        .from('replies')
        .select('*', { count: 'exact', head: true })
        .eq('discussion_id', d.id);
      return { ...d, replyCount: count || 0 };
    }));

    return discussionsWithReplies;
  }

  async createReply(reply: InsertReply): Promise<Reply> {
    const { data, error } = await supabaseAdmin
      .from('replies')
      .insert(reply)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getDiscussionReplies(discussionId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('replies')
      .select('*, author:users(id, first_name, last_name, profile_image_url)')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // CERTIFICATION OPERATIONS
  // ============================================================================

  // ============================================================================
  // CERTIFICATION OPERATIONS
  // ============================================================================

  async createCertification(
    certification: InsertCertification,
  ): Promise<Certification> {
    const { data, error } = await supabaseAdmin
      .from('certifications')
      .insert(certification)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserCertifications(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('certifications')
      .select('*, course:courses(id, title, thumbnail_url)')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================

  async createOrder(order: InsertOrder): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert(order)
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
      .from('orders')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
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
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('paystack_reference', reference)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserOrders(userId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // ============================================================================
  // QUIZ OPERATIONS
  // ============================================================================

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert(quiz)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getQuizById(id: string): Promise<Quiz | undefined> {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data;
  }

  async getLessonQuizzes(lessonId: string): Promise<Quiz[]> {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('lesson_id', lessonId);
    
    if (error) throw error;
    return data || [];
  }

  async createQuizQuestion(
    question: InsertQuizQuestion,
  ): Promise<QuizQuestion> {
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .insert(question)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    const { data, error } = await supabaseAdmin
      .from('quiz_answers')
      .insert(answer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async submitQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const { data, error } = await supabaseAdmin
      .from('quiz_attempts')
      .insert(attempt)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async recordQuizResponse(
    response: InsertQuizResponse,
  ): Promise<QuizResponse> {
    const { data, error } = await supabaseAdmin
      .from('quiz_responses')
      .insert(response)
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
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('started_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getCourseQuizzes(courseId: string): Promise<Quiz[]> {
    // Note: Quizzes are usually linked to lessons, but let's follow the previous logic
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select('*, lesson:lessons!inner(*)')
      .eq('lesson.module.course_id', courseId);
    
    if (error) throw error;
    return data || [];
  }

  async getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | undefined> {
    const { data, error } = await supabaseAdmin
      .from('enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (error || !data) return undefined;
    return data;
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

  // ============================================================================
  // ASSIGNMENT OPERATIONS
  // ============================================================================

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .insert(assignment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getAssignmentById(id: string): Promise<Assignment | undefined> {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data;
  }

  async getLessonAssignments(lessonId: string): Promise<Assignment[]> {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('lesson_id', lessonId);
    
    if (error) throw error;
    return data || [];
  }

  async submitAssignment(
    submission: InsertAssignmentSubmission,
  ): Promise<AssignmentSubmission> {
    const { data, error } = await supabaseAdmin
      .from('assignment_submissions')
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
      .from('assignment_submissions')
      .update({
        score,
        feedback,
        graded_by: graderId,
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
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
      .from('assignment_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('assignment_id', assignmentId);
    
    if (error) throw error;
    return data || [];
  }

  async getAssignmentByLessonId(
    lessonId: string,
  ): Promise<Assignment | undefined> {
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    
    if (error || !data) return undefined;
    return data;
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('assignments')
      .delete()
      .eq('id', assignmentId);
    
    if (error) throw error;
  }

  // ============================================================================
  // INSTRUCTOR PAYOUT OPERATIONS
  // ============================================================================

  async createInstructorPayout(
    payout: InsertInstructorPayout,
  ): Promise<InstructorPayout> {
    const { data, error } = await supabaseAdmin
      .from('instructor_payouts')
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
      .from('instructor_payouts')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('requested_at', { ascending: false });
    
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
      .from('instructor_payouts')
      .update(updateData)
      .eq('id', payoutId)
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
      .from('instructor_applications')
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
      .from('instructor_applications')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .maybeSingle();
    
    if (error || !data) return undefined;
    return data;
  }

  async getInstructorApplications(filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<InstructorApplication[]> {
    let query = supabaseAdmin
      .from('instructor_applications')
      .select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('submitted_at', { ascending: false });

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
      .from('instructor_applications')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

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
    // Get counts
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: totalInstructors } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'instructor');

    const { count: pendingApplications } = await supabaseAdmin
      .from('instructor_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: totalCourses } = await supabaseAdmin
      .from('courses')
      .select('*', { count: 'exact', head: true });

    // Monthly revenue
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: revenueRows } = await supabaseAdmin
      .from('orders')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString());
    
    const monthlyRevenue = (revenueRows || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );

    // Active students
    const { count: activeStudents } = await supabaseAdmin
      .from('enrollments')
      .select('user_id', { count: 'exact', head: true });

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
    let query = supabaseAdmin.from('users').select('*');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

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
  }): Promise<any[]> {
    let query = supabaseAdmin
      .from('courses')
      .select('id, title, price, is_published, enrollment_count, created_at, instructor:users(first_name, last_name)');

    if (filters?.instructor) {
      query = query.eq('instructor_id', filters.instructor);
    }

    query = query.order('created_at', { ascending: false });

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
  // CURRICULUM MANAGEMENT OPERATIONS
  // ============================================================================

  async getCourseModules(courseId: string): Promise<any[]> {
    const { data: modulesData, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('order', { ascending: true });
    
    if (modulesError) throw modulesError;
    
    // Ensure lessons are also ordered
    return (modulesData || []).map(m => ({
      ...m,
      lessons: (m.lessons || []).sort((a, b) => a.order - b.order)
    }));
  }

  async createModule(module: InsertModule): Promise<Module> {
    const { data: maxOrderData } = await supabaseAdmin
      .from('modules')
      .select('order')
      .eq('course_id', module.course_id)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.order ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from('modules')
      .insert({ ...module, order: nextOrder })
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
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteModule(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('modules')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async reorderModules(courseId: string, moduleOrder: string[]): Promise<void> {
    for (let i = 0; i < moduleOrder.length; i++) {
      await supabaseAdmin
        .from('modules')
        .update({ order: i })
        .eq('id', moduleOrder[i]);
    }
  }

  async reorderLessons(moduleId: string, lessonOrder: string[]): Promise<void> {
    for (let i = 0; i < lessonOrder.length; i++) {
      await supabaseAdmin
        .from('lessons')
        .update({ order: i })
        .eq('id', lessonOrder[i]);
    }
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const { data: maxOrderData } = await supabaseAdmin
      .from('lessons')
      .select('order')
      .eq('module_id', lesson.module_id)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.order ?? -1) + 1;

    const { data, error } = await supabaseAdmin
      .from('lessons')
      .insert({ ...lesson, order: nextOrder })
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
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteLesson(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('lessons')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ============================================================================
  // COURSE RESOURCES OPERATIONS
  // ============================================================================

  async createCourseResource(
    resource: InsertCourseResource,
  ): Promise<CourseResource> {
    const { data, error } = await supabaseAdmin
      .from('course_resources')
      .insert(resource)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getLessonResources(lessonId: string): Promise<CourseResource[]> {
    const { data, error } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('lesson_id', lessonId);
    if (error) throw error;
    return data || [];
  }

  async getCourseResources(courseId: string): Promise<CourseResource[]> {
    const { data, error } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  }

  async deleteCourseResource(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('course_resources')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ============================================================================
  // QUIZ AND ASSIGNMENT OPERATIONS
  // ============================================================================

  async createOrUpdateQuiz(lessonId: string, quizData: any) {
    // Check if quiz already exists for this lesson
    const { data: existing } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('lesson_id', lessonId)
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
        .from('quizzes')
        .update(quizPayload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      quizId = updated.id;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('quizzes')
        .insert(quizPayload)
        .select()
        .single();
      if (error) throw error;
      quizId = created.id;
    }

    // Upsert questions and answers if provided
    if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
      // Delete existing questions (cascade should remove responses/answers)
      await supabaseAdmin.from('quiz_questions').delete().eq('quiz_id', quizId);

      for (let i = 0; i < quizData.questions.length; i++) {
        const q = quizData.questions[i];
        const { data: question, error: qError } = await supabaseAdmin
          .from('quiz_questions')
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
          await supabaseAdmin.from('quiz_answers').insert(answersPayload);
        }
      }
    }

    return await this.getQuizWithQuestions(quizId);
  }

  // Fetch quiz with all questions and answers (answers shuffled, isCorrect hidden for students)
  async getQuizWithQuestions(quizId: string, hideCorrect = false) {
    const { data: quiz, error } = await supabaseAdmin
      .from('quizzes')
      .select('*, questions:quiz_questions(*, answers:quiz_answers(*))')
      .eq('id', quizId)
      .single();
    
    if (error || !quiz) return null;

    // Supabase returns nested relations. We might need to sort them as they may not be sorted by 'order'
    const sortedQuestions = (quiz.questions || []).sort((a, b) => a.order - b.order).map(q => ({
      ...q,
      answers: (q.answers || []).sort((a, b) => a.order - b.order).map(a => {
        if (hideCorrect) {
          const { is_correct: _, ...rest } = a;
          return rest;
        }
        return a;
      })
    }));

    return { ...quiz, questions: sortedQuestions };
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', quizId);
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

      await supabaseAdmin.from('quiz_responses').insert({
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
      .from('quiz_attempts')
      .update({
        score,
        passed,
        completed_at: new Date().toISOString(),
        time_spent: timeSpent,
      })
      .eq('id', attemptId)
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
