/**
 * Enrollments Routes - /api/enrollments/* endpoints
 * Implements eligibility-driven enrollment flow
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { getQualificationStatus } from "../storage/qualification";
import { 
  checkEligibility, 
  createEnrollment,
} from "../storage/enrollment";
import { getProfessionalProfileByUserId } from "../storage/professionalProfiles";
import { requireSupabaseAuth } from "../supabaseAuth";
import { asyncHandler, eligibilityLimiter } from "../middleware/security";
import { insertEnrollmentSchema, insertProgressSchema } from "@shared/schema";
import { createClient } from "@supabase/supabase-js";
import type { EligibilityResponse, EnrollmentLevel } from "@shared/enrollmentEligibility";
import { send400Error, validateRequiredFields } from "../middleware/error-fixes";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

interface ProgressEntry {
  completed: boolean;
  lessonId: string;
}

interface LessonEntry {
  id: string;
}

interface CertEntry {
  courseId: string;
}

const router = Router();

// Create Supabase client for review prompts
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Check eligibility before enrollment
router.post(
  "/check-eligibility",
  requireSupabaseAuth,
  eligibilityLimiter,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { courseId, enrollmentLevel } = req.body;

    // Enhanced validation with better error messages
    const validation = validateRequiredFields(req, ['courseId']);
    if (!validation.isValid) {
      return send400Error(res, validation.error.message, validation.error);
    }

    const course = await storage.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resolvedLevel = await resolveEnrollmentLevel(userId, enrollmentLevel, course.level);
    const eligibility = await checkEligibility(user, course, resolvedLevel);
    res.json(eligibility);
  }),
);

// Enroll in a course with eligibility check
router.post(
  "/",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { courseId, enrollmentLevel } = req.body;

    // Enhanced validation with better error messages
    const validation = validateRequiredFields(req, ['courseId']);
    if (!validation.isValid) {
      return send400Error(res, validation.error.message, validation.error);
    }

    const course = await storage.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check eligibility
    const resolvedLevel = await resolveEnrollmentLevel(userId, enrollmentLevel, course.level);
    const eligibility = await checkEligibility(user, course, resolvedLevel);

    if (eligibility.status === "BLOCKED") {
      return res.status(403).json(formatEligibilityError(eligibility));
    }

    // Direct enrollment
    const enrollment = await createEnrollment(
      userId,
      courseId,
      resolvedLevel,
      "COURSE",
    );

    res.json(enrollment);
  }),
);

async function resolveEnrollmentLevel(
  userId: string,
  requestedLevel: string | undefined,
  courseLevel: string | undefined,
): Promise<EnrollmentLevel> {
  // Fetch user's actual assigned level from the users table
  const user = await storage.getUser(userId);
  const userLevel = user?.assigned_level?.toUpperCase() as EnrollmentLevel | undefined;

  // If user has a valid assigned level (from admin review or course completion), use it
  if (userLevel === "ASSOCIATE" || userLevel === "MEMBER" || userLevel === "FELLOW") {
    return userLevel;
  }

  // For users with NONE or no assigned level, default to ASSOCIATE
  // so they can start the Associate course path and earn their level
  const fallback = courseLevel ? courseLevel.toUpperCase() : "ASSOCIATE";
  const raw = (requestedLevel || fallback).toUpperCase();
  if (raw === "ASSOCIATE" || raw === "MEMBER" || raw === "FELLOW") {
    return raw;
  }
  return "ASSOCIATE";
}

function formatEligibilityError(eligibility: EligibilityResponse) {
  return {
    message: eligibility.ui.message,
    ui: eligibility.ui,
    progression: eligibility.progression,
  };
}

// Get my enrollments
router.get(
  "/",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const enrollments = await storage.getUserEnrollments(userId);
    res.json(enrollments);
  }),
);

// Check enrollment status for a course
router.get(
  "/check/:courseId",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { courseId } = req.params;
    const enrollment = await storage.getEnrollment(userId, courseId);
    res.json({ isEnrolled: !!enrollment, enrollment });
  }),
);

// Update progress
router.post(
  "/progress",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const progressData = insertProgressSchema.parse({ ...req.body, userId });
    const progress = await storage.updateProgress(progressData);

    // Check if course is completed and generate certificate
    if (progressData.completed && progressData.lessonId) {
      try {
        const lesson = await storage.getLessonById(progressData.lessonId);
        if (lesson) {
          const courseId = lesson.module?.courseId || lesson.courseId || "";
          if (courseId) {
            const allLessons = await storage.getCourseLessons(courseId);
            const userProgress = await storage.getUserProgress(userId, courseId);

            const completedLessonIds = new Set(
              userProgress
                .filter((p: ProgressEntry) => p.completed)
                .map((p: ProgressEntry) => p.lessonId),
            );

            const allCompleted = allLessons.every(
              (l: LessonEntry) =>
                completedLessonIds.has(l.id) ||
                l.id === progressData.lessonId,
            );

            // Check for midway review prompt at 50% progress
            const progressPercentage = (completedLessonIds.size / allLessons.length) * 100;
            if (progressPercentage >= 50 && progressPercentage < 51) {
              // Check if midway prompt already exists
              const { data: existingPrompt } = await supabase
                .from("review_prompts")
                .select("id")
                .eq("user_id", userId)
                .eq("course_id", courseId)
                .eq("prompt_type", "midway")
                .maybeSingle();

              if (!existingPrompt) {
                // Create midway review prompt
                await supabase.from("review_prompts").insert({
                  user_id: userId,
                  course_id: courseId,
                  prompt_type: "midway",
                  prompt_question: "How are you finding the course material so far?",
                  shown_at: new Date().toISOString(),
                });
              }
            }

            if (allCompleted) {
              const existingCerts = await storage.getUserCertifications(userId);
              const hasCert = existingCerts.some(
                (c: CertEntry) => c.courseId === courseId,
              );

              if (!hasCert) {
                // Check if end-of-course prompt already exists
                const { data: existingEndPrompt } = await supabase
                  .from("review_prompts")
                  .select("id")
                  .eq("user_id", userId)
                  .eq("course_id", courseId)
                  .eq("prompt_type", "end_course")
                  .maybeSingle();

                if (!existingEndPrompt) {
                  // Create end-of-course review prompt before certificate
                  await supabase.from("review_prompts").insert({
                    user_id: userId,
                    course_id: courseId,
                    prompt_type: "end_course",
                    prompt_question: "How likely are you to recommend CIMA to a colleague?",
                    shown_at: new Date().toISOString(),
                  });
                }

                await storage.createCertification({
                  userId,
                  courseId,
                  certificateUrl: `/api/certificates/${courseId}/${userId}`,
                });
                await storage.updateEnrollmentProgress(userId, courseId, 100);
              }
            }
          }
        }
      } catch (certError) {
        console.error("Certificate generation error:", certError);
      }
    }

    res.json(progress);
  }),
);

// Get progress for a course
router.get(
  "/progress/:courseId",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { courseId } = req.params;
    const progress = await storage.getUserProgress(userId, courseId);
    res.json(progress);
  }),
);

// Get overall progress overview
router.get(
  "/progress/overview",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const overview = await storage.getUserOverallProgress(userId);
    res.json(overview);
  }),
);

// Get pending assignments
router.get(
  "/assignments/pending",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const assignments = await storage.getStudentPendingAssignments(userId);
    res.json(assignments);
  }),
);

// Get pending quizzes
router.get(
  "/quizzes/pending",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const quizzes = await storage.getStudentPendingQuizzes(userId);
    res.json(quizzes);
  }),
);

// Get course recommendations
router.get(
  "/recommendations",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const recommendations = await storage.getCourseRecommendations(userId);
    res.json(recommendations);
  }),
);

// Get downloadable resources
router.get(
  "/resources/downloadable",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const resources = await storage.getStudentDownloadableResources(userId);
    res.json(resources);
  }),
);

export default router;
