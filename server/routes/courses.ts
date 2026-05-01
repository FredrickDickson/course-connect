/**
 * Courses Routes - /api/courses/* endpoints
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireInstructor } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";
import { insertCourseSchema } from "@shared/schema";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

// Get all courses (public)
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { category, search, level, featured, pathway } = req.query;
    const courses = await storage.getCourses({
      category: category as string,
      search: search as string,
      level: level as string,
      featured: featured === "true" ? true : featured === "false" ? false : undefined,
      pathway: pathway as string,
    });
    res.json(courses);
  }),
);

// Get featured courses (public)
router.get(
  "/featured",
  asyncHandler(async (req: Request, res: Response) => {
    const courses = await storage.getFeaturedCourses();
    res.json(courses);
  }),
);

// Get platform stats (public)
router.get(
  "/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await storage.getRealPlatformStats();
    res.json(stats);
  }),
);

// Get single course (public)
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await storage.getCourseById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  }),
);

// Instructor: create course
router.post(
  "/",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const courseData = insertCourseSchema.parse({
      ...req.body,
      instructorId,
    });
    const course = await storage.createCourse(courseData);
    res.json(course);
  }),
);

// Instructor: update course
router.put(
  "/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const { id } = req.params;

    const course = await storage.getCourseById(id);
    if (!course || course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updates = insertCourseSchema.partial().parse(req.body);
    const updatedCourse = await storage.updateCourse(id, updates);
    res.json(updatedCourse);
  }),
);

// Instructor: delete course
router.delete(
  "/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const { id } = req.params;

    const course = await storage.getCourseById(id);
    if (!course || course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await storage.deleteCourse(id);
    res.json({ success: true });
  }),
);

// Instructor: get my courses
router.get(
  "/instructor/my-courses",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const courses = await storage.getInstructorCourses(instructorId);
    res.json(courses);
  }),
);

// Instructor: get my stats
router.get(
  "/instructor/stats",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const stats = await storage.getInstructorStats(instructorId);
    res.json(stats);
  }),
);

// Instructor: get monthly revenue
router.get(
  "/instructor/revenue",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const revenueData = await storage.getInstructorMonthlyRevenue(instructorId);
    res.json(revenueData);
  }),
);

// Instructor: get analytics
router.get(
  "/instructor/analytics",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const analytics = await storage.getInstructorAnalytics(instructorId);
    res.json(analytics);
  }),
);

// Instructor: get pending submissions
router.get(
  "/instructor/submissions/pending",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const submissions = await storage.getInstructorPendingSubmissions(instructorId);
    res.json(submissions);
  }),
);

// Instructor: get student questions
router.get(
  "/instructor/questions",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const questions = await storage.getInstructorStudentQuestions(instructorId);
    res.json(questions);
  }),
);

export default router;
