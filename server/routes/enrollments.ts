/**
 * Enrollments Routes - /api/enrollments/* endpoints
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { getQualificationStatus } from "../storage/qualification";
import { requireSupabaseAuth } from "../supabaseAuth";
import { asyncHandler } from "../middleware/security";
import { insertEnrollmentSchema, insertProgressSchema } from "@shared/schema";

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

// Enroll in a course
router.post(
  "/",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const enrollmentData = insertEnrollmentSchema.parse({
      ...req.body,
      userId,
    });

    const isEnrolled = await storage.isUserEnrolled(
      userId,
      enrollmentData.courseId || "",
    );
    if (isEnrolled) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    // Check qualification eligibility
    const course = await storage.getCourseById(enrollmentData.courseId || "");
    if (course) {
      const qualificationStatus = await getQualificationStatus(userId);
      
      if (qualificationStatus) {
        const courseLevel = course.level; // 'associate', 'member', 'fellow'
        const userLevel = qualificationStatus.currentLevel;

        // Eligibility rules:
        // - Associate level: Open to all
        // - Member level: Requires Associate or higher
        // - Fellow level: Requires Member or higher
        if (courseLevel === "member" && userLevel === "NONE") {
          return res.status(403).json({ 
            message: "You must complete the Associate level before enrolling in Member courses" 
          });
        }
        
        if (courseLevel === "fellow" && userLevel !== "MEMBER" && userLevel !== "FELLOW") {
          return res.status(403).json({ 
            message: "You must complete the Member level before enrolling in Fellow courses" 
          });
        }
      }
    }

    const enrollment = await storage.enrollUser(enrollmentData);
    res.json(enrollment);
  }),
);

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

            if (allCompleted) {
              const existingCerts = await storage.getUserCertifications(userId);
              const hasCert = existingCerts.some(
                (c: CertEntry) => c.courseId === courseId,
              );

              if (!hasCert) {
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
