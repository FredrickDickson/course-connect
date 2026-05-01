/**
 * Storage Index - Barrel file re-exporting all storage modules
 * 
 * This maintains backward compatibility with existing imports:
 *   import { storage } from "../storage";
 */

// Re-export all user operations
export {
  getUser,
  getUserByEmail,
  upsertUser,
  updateUser,
  updateUserPaystackInfo,
  updateUserRole,
  getInstructors,
  getUsers,
} from "./users";

// Re-export all course operations
export {
  getCategories,
  createCategory,
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getFeaturedCourses,
  getInstructorCourses,
  getInstructorStats,
  getCoursesForAdmin,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getLessonById,
  getCourseLessons,
  createCourseResource,
  getLessonResources,
  getCourseResources,
  deleteCourseResource,
  validateCourseForPublishing,
  publishCourse,
  unpublishCourse,
  getRealPlatformStats,
  getInstructorMonthlyRevenue,
  getInstructorAnalytics,
  getInstructorPendingSubmissions,
  getInstructorStudentQuestions,
  getCourseRecommendations,
} from "./courses";

// Re-export all enrollment operations
export {
  enrollUser,
  getUserEnrollments,
  isUserEnrolled,
  updateEnrollmentProgress,
  getEnrollment,
  updateProgress,
  getUserProgress,
  getUserOverallProgress,
  getStudentPendingAssignments,
  getStudentPendingQuizzes,
  getStudentDownloadableResources,
} from "./enrollments";

// Re-export new enrollment eligibility functions
export {
  checkEligibility,
  createEnrollment,
  createFellowshipApplication,
  updateEnrollmentStatus,
} from "./enrollment";
export type { EligibilityResponse, EligibilityStatus } from "@shared/enrollmentEligibility";

// Re-export all quiz operations
export {
  createQuiz,
  getQuizById,
  getLessonQuizzes,
  getCourseQuizzes,
  deleteQuiz,
  createQuizQuestion,
  createQuizAnswer,
  submitQuizAttempt,
  getQuizAttempts,
  recordQuizResponse,
  createOrUpdateQuiz,
  getQuizWithQuestions,
  gradeQuizAttempt,
} from "./quizzes";

// Re-export all assignment operations
export {
  createAssignment,
  getAssignmentById,
  getAssignmentByLessonId,
  getLessonAssignments,
  deleteAssignment,
  submitAssignment,
  gradeAssignment,
  getUserAssignmentSubmissions,
  createOrUpdateAssignment,
} from "./assignments";

// Re-export all payment operations
export {
  createOrder,
  updateOrderStatus,
  updateOrderByReference,
  getUserOrders,
  createInstructorPayout,
  getInstructorPayouts,
  updatePayoutStatus,
  createInstructorApplication,
  getInstructorApplicationByUserId,
  getInstructorApplications,
  updateInstructorApplication,
  getAdminStats,
} from "./payments";

// Re-export all qualification operations
export {
  getQualificationStatus,
  getAvailablePathways,
  createExpeditedApplication,
  getUserExpeditedApplications,
  getExpeditedApplicationById,
  hasPendingApplication,
  uploadApplicationDocument,
  submitQualificationAssessment,
  updateUserQualificationLevel,
} from "./qualification";

export {
  saveProfessionalProfileDraft,
  getProfessionalProfileByUserId,
  getProfessionalProfileById,
  listProfessionalProfiles,
  addProfessionalDocument,
  getProfessionalDocuments,
  deleteProfessionalDocument,
  updateProfessionalProfileReview,
  grantLevelWaiver,
  revokeLevelWaiver,
  getLevelWaiversForUser,
} from "./professionalProfiles";

// Re-export types
export type { IStorage } from "./types";

// Additional domain methods that don't fit the simple pattern
import { createClient } from "@supabase/supabase-js";
import type { InsertReview, Review, InsertDiscussion, Discussion, InsertReply, Reply, InsertCertification, Certification } from "@shared/schema";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Review operations (independent domain)
export async function createReview(review: InsertReview): Promise<Review> {
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
  // Update course rating asynchronously
  if (review.courseId) {
    updateCourseRating(review.courseId).catch(console.error);
  }
  return data;
}

export async function getCourseReviews(courseId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*, user:users(id, first_name, last_name, profile_image_url)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateCourseRating(courseId: string): Promise<void> {
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

// Discussion operations (independent domain)
export async function createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
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

export async function getCourseDiscussions(courseId: string): Promise<any[]> {
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

export async function createReply(reply: InsertReply): Promise<Reply> {
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

export async function getDiscussionReplies(discussionId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("replies")
    .select("*, author:users(id, first_name, last_name, profile_image_url)")
    .eq("discussion_id", discussionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Certification operations (independent domain)
export async function createCertification(
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

export async function getUserCertifications(userId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("certifications")
    .select("*, course:courses(id, title, thumbnail_url)")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
