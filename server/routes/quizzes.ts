/**
 * Quizzes Routes - /api/quizzes/* endpoints
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireInstructor } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

// Get quiz with questions (student view - hides correct answers)
router.get(
  "/:quizId",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quizId } = req.params;
    const quiz = await storage.getQuizWithQuestions(quizId, true);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    res.json(quiz);
  }),
);

// Get quiz attempts for current user
router.get(
  "/:quizId/attempts",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { quizId } = req.params;
    const attempts = await storage.getQuizAttempts(userId, quizId);
    res.json(attempts);
  }),
);

// Submit quiz answers
router.post(
  "/:quizId/submit",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { quizId } = req.params;
    const { responses, timeSpent } = req.body;

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({ message: "responses array is required" });
    }

    const quiz = await storage.getQuizById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const existingAttempts = await storage.getQuizAttempts(userId, quizId);
    if (quiz.maxAttempts && existingAttempts.length >= quiz.maxAttempts) {
      return res
        .status(400)
        .json({ message: `Maximum attempts (${quiz.maxAttempts}) reached` });
    }

    const attempt = await storage.submitQuizAttempt({
      userId,
      quizId,
      answers: responses,
      timeSpent,
    });

    const gradedAttempt = await storage.gradeQuizAttempt(
      attempt.id,
      userId,
      quizId,
      responses,
      timeSpent,
    );

    res.json({
      attemptId: gradedAttempt.id,
      score: gradedAttempt.score,
      passed: gradedAttempt.passed,
      totalPoints: gradedAttempt.totalPoints,
      completedAt: gradedAttempt.completedAt,
    });
  }),
);

// Instructor: Create or update quiz for a lesson
router.post(
  "/lessons/:lessonId/quiz",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const quizData = req.body;

    const quiz = await storage.createOrUpdateQuiz(lessonId, quizData);
    res.status(201).json(quiz);
  }),
);

// Get quiz for a lesson (student)
router.get(
  "/lessons/:lessonId/quiz",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const quizzes = await storage.getLessonQuizzes(lessonId);
    res.json(quizzes?.[0] || null);
  }),
);

// Instructor: Delete quiz
router.delete(
  "/:quizId",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quizId } = req.params;
    await storage.deleteQuiz(quizId);
    res.json({ success: true });
  }),
);

// Get quizzes for a course (enrolled students only)
router.get(
  "/courses/:courseId/quizzes",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user.claims.sub;

    const enrollment = await storage.getEnrollment(userId, courseId);
    if (!enrollment) {
      return res.status(403).json({ error: "Access denied to this course" });
    }

    const quizzes = await storage.getCourseQuizzes(courseId);
    res.json(quizzes);
  }),
);

// Backward compatibility: singular quiz redirect
router.get(
  "/quiz/:quizId",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.redirect(`/api/quizzes/${req.params.quizId}`);
  }),
);

export default router;
