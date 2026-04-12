/**
 * API Routes Configuration
 *
 * This file defines all HTTP endpoints for the CIMA Learning Platform.
 * It handles authentication, course management, enrollments, payments,
 * discussions, and administrative functions.
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import express from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client directly for certificate route
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
import { requireSupabaseAuth } from "./supabaseAuth";
import { requireRole, requireInstructor } from "./middleware/roleProtection";
import {
  securityMiddleware,
  authLimiter,
  uploadLimiter,
  errorHandler,
  asyncHandler,
} from "./middleware/security";
import {
  imageUpload,
  videoUpload,
  documentUpload,
  courseContentUpload,
  profileImageUpload,
  handleUploadError,
  getFileUrl,
} from "./middleware/upload";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import {
  insertCourseSchema,
  insertEnrollmentSchema,
  insertReviewSchema,
  insertDiscussionSchema,
  insertReplySchema,
  insertProgressSchema,
  insertInstructorApplicationSchema,
} from "@shared/schema";

/// Define authenticated request type for TypeScript compatibility
interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: {
      sub: string;
    };
  };
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

// Progress entry type for certificate checking
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

// Paystack payment gateway configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Registers all API routes and middleware with the Express application
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Apply security middleware in production only
  if (process.env.NODE_ENV === "production") {
    app.use(securityMiddleware);
  }

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  // SECURITY: bootstrap endpoint — disable in production after first admin is created
  app.post(
    "/api/admin/check-user",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const { email } = req.body;

      try {
        const user = await storage.getUserByEmail(email);

        if (user) {
          res.json({
            exists: true,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            },
          });
        } else {
          res.json({ exists: false });
        }
      } catch (error) {
        res.json({ exists: false, error: "Database connection issue" });
      }
    }),
  );

  app.get(
    "/api/debug/status",
    asyncHandler(async (req: Request, res: Response) => {
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ message: "Not available in production" });
      }

      try {
        const users = await storage.getUsers({ limit: 10 });
        res.json({
          database_status: "connected",
          user_count: users.length,
          recent_users: users.map((u) => ({
            id: u.id,
            email: u.email,
            role: u.role,
          })),
        });
      } catch (error) {
        res.json({
          database_status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  // ============================================================================
  // USER & AUTHENTICATION ROUTES
  // ============================================================================

  app.get(
    "/api/auth/user",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    }),
  );

  app.post(
    "/api/auth/profile/image",
    requireSupabaseAuth,
    uploadLimiter,
    profileImageUpload.single("image"),
    handleUploadError,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const userId = req.user.claims.sub;
      const imageUrl = getFileUrl(req, req.file.filename, "image");

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        profileImageUrl: imageUrl,
      });

      res.json({
        message: "Profile image updated successfully",
        profileImageUrl: imageUrl,
        user: updatedUser,
      });
    }),
  );

  // ============================================================================
  // CATEGORY ROUTES
  // ============================================================================

  app.get(
    "/api/categories",
    asyncHandler(async (req: Request, res: Response) => {
      const categories = await storage.getCategories();
      res.json(categories);
    }),
  );

  app.post(
    "/api/categories",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const { name, description, slug } = req.body;
      if (!name || name.length < 2 || name.length > 100) {
        return res
          .status(400)
          .json({ message: "Name must be between 2 and 100 characters" });
      }
      if (!slug || slug.length < 2 || slug.length > 100) {
        return res
          .status(400)
          .json({ message: "Slug must be between 2 and 100 characters" });
      }
      const category = await storage.createCategory({
        name,
        description,
        slug,
      });
      res.status(201).json(category);
    }),
  );

  // ============================================================================
  // COURSE ROUTES
  // ============================================================================

  app.get(
    "/api/courses",
    asyncHandler(async (req: Request, res: Response) => {
      const { category, search, level, featured } = req.query;
      const courses = await storage.getCourses({
        category: category as string,
        search: search as string,
        level: level as string,
        featured:
          featured === "true" ? true : featured === "false" ? false : undefined,
      });
      res.json(courses);
    }),
  );

  app.get(
    "/api/courses/featured",
    asyncHandler(async (req: Request, res: Response) => {
      const courses = await storage.getFeaturedCourses();
      res.json(courses);
    }),
  );

  app.get(
    "/api/courses/stats",
    asyncHandler(async (req: Request, res: Response) => {
      const stats = await storage.getRealPlatformStats();
      res.json(stats);
    }),
  );

  app.get(
    "/api/courses/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const course = await storage.getCourseById(id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    }),
  );

  // ============================================================================
  // FILE UPLOAD ROUTES
  // ============================================================================

  app.post(
    "/api/upload/video",
    requireSupabaseAuth,
    requireInstructor(),
    uploadLimiter,
    videoUpload.single("video"),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const videoUrl = getFileUrl(req, req.file.filename, "video");
      res.json({
        message: "Video uploaded successfully",
        videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        duration: null,
      });
    }),
  );

  app.post(
    "/api/upload/image",
    requireSupabaseAuth,
    uploadLimiter,
    imageUpload.single("image"),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = getFileUrl(req, req.file.filename, "image");
      res.json({
        message: "Image uploaded successfully",
        imageUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    }),
  );

  app.post(
    "/api/upload/document",
    requireSupabaseAuth,
    uploadLimiter,
    documentUpload.single("document"),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No document file provided" });
      }

      const documentUrl = getFileUrl(req, req.file.filename, "document");
      res.json({
        message: "Document uploaded successfully",
        documentUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    }),
  );

  app.post(
    "/api/upload/course-content",
    requireSupabaseAuth,
    requireInstructor(),
    uploadLimiter,
    courseContentUpload.array("files", 10),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      const uploadedFiles = files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        url: getFileUrl(
          req,
          file.filename,
          file.fieldname === "video" ? "video" : "image",
        ),
        size: file.size,
        type: file.mimetype,
      }));

      res.json({
        message: "Files uploaded successfully",
        files: uploadedFiles,
      });
    }),
  );

  // ============================================================================
  // ENROLLMENT ROUTES
  // ============================================================================

  app.post(
    "/api/enrollments",
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
        return res
          .status(400)
          .json({ message: "Already enrolled in this course" });
      }

      const enrollment = await storage.enrollUser(enrollmentData);
      res.json(enrollment);
    }),
  );

  app.get(
    "/api/enrollments",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getUserEnrollments(userId);
      res.json(enrollments);
    }),
  );

  app.get(
    "/api/enrollments/check/:courseId",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const enrollment = await storage.getEnrollment(userId, courseId);
      res.json({ isEnrolled: !!enrollment, enrollment });
    }),
  );

  app.post(
    "/api/progress",
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
              // Check if all lessons are completed
              const allLessons = await storage.getCourseLessons(courseId);
              const userProgress = await storage.getUserProgress(
                userId,
                courseId,
              );

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
                // Check if certificate already exists
                const existingCerts =
                  await storage.getUserCertifications(userId);
                const hasCert = existingCerts.some(
                  (c: CertEntry) => c.courseId === courseId,
                );

                if (!hasCert) {
                  // Generate certificate
                  await storage.createCertification({
                    userId,
                    courseId,
                    certificateUrl: `/api/certificates/${courseId}/${userId}`,
                  });

                  // Update enrollment to mark as completed
                  await storage.updateEnrollmentProgress(userId, courseId, 100);
                }
              }
            }
          }
        } catch (certError) {
          console.error("Certificate generation error:", certError);
          // Don't fail the progress update if cert generation fails
        }
      }

      res.json(progress);
    }),
  );

  app.get(
    "/api/progress/:courseId",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const progress = await storage.getUserProgress(userId, courseId);
      res.json(progress);
    }),
  );

  app.get(
    "/api/progress/overview",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const overview = await storage.getUserOverallProgress(userId);
      res.json(overview);
    }),
  );

  // Student dashboard endpoints — real DB data
  app.get(
    "/api/assignments",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const assignments = await storage.getStudentPendingAssignments(userId);
      res.json(assignments);
    }),
  );

  app.get(
    "/api/quizzes/pending",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const quizzes = await storage.getStudentPendingQuizzes(userId);
      res.json(quizzes);
    }),
  );

  app.get(
    "/api/recommendations",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const recommendations = await storage.getCourseRecommendations(userId);
      res.json(recommendations);
    }),
  );

  app.get(
    "/api/resources/downloadable",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const resources = await storage.getStudentDownloadableResources(userId);
      res.json(resources);
    }),
  );

  // ============================================================================
  // QUIZ ROUTES
  // ============================================================================

  // Get quiz with questions (answers shuffled, isCorrect hidden)
  app.get(
    "/api/quizzes/:quizId",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { quizId } = req.params;
      const quiz = await storage.getQuizWithQuestions(quizId, true); // hideCorrect=true for students
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }
      res.json(quiz);
    }),
  );

  // Backward compatibility alias for singular
  app.get(
    "/api/quiz/:quizId",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      res.redirect(`/api/quizzes/${req.params.quizId}`);
    }),
  );

  // Get quiz attempts for current user
  app.get(
    "/api/quizzes/:quizId/attempts",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const { quizId } = req.params;
      const attempts = await storage.getQuizAttempts(userId, quizId);
      res.json(attempts);
    }),
  );

  // Submit quiz answers → grades and returns score
  app.post(
    "/api/quizzes/:quizId/submit",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const { quizId } = req.params;
      const { responses, timeSpent } = req.body;

      if (!Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({ message: "responses array is required" });
      }

      // Check attempt limits
      const quiz = await storage.getQuizById(quizId);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });

      const existingAttempts = await storage.getQuizAttempts(userId, quizId);
      if (quiz.maxAttempts && existingAttempts.length >= quiz.maxAttempts) {
        return res
          .status(400)
          .json({ message: `Maximum attempts (${quiz.maxAttempts}) reached` });
      }

      // Create attempt record first
      const attempt = await storage.submitQuizAttempt({
        userId,
        quizId,
        answers: responses,
        timeSpent,
      });

      // Grade it
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

  // Reviews
  app.post(
    "/api/reviews",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const reviewData = insertReviewSchema.parse({ ...req.body, userId });
      const review = await storage.createReview(reviewData);
      res.json(review);
    }),
  );

  app.get(
    "/api/reviews/:courseId",
    asyncHandler(async (req: Request, res: Response) => {
      const { courseId } = req.params;
      const reviews = await storage.getCourseReviews(courseId);
      res.json(reviews);
    }),
  );

  // ============================================================================
  // DISCUSSION & COMMUNITY ROUTES
  // ============================================================================

  app.post(
    "/api/discussions",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const discussionData = insertDiscussionSchema.parse({
        ...req.body,
        userId,
      });
      const discussion = await storage.createDiscussion(discussionData);
      res.json(discussion);
    }),
  );

  app.get(
    "/api/discussions/:courseId",
    asyncHandler(async (req: Request, res: Response) => {
      const { courseId } = req.params;
      const discussions = await storage.getCourseDiscussions(courseId);
      res.json(discussions);
    }),
  );

  app.post(
    "/api/replies",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const replyData = insertReplySchema.parse({ ...req.body, userId });
      const reply = await storage.createReply(replyData);
      res.json(reply);
    }),
  );

  app.get(
    "/api/replies/:discussionId",
    asyncHandler(async (req: Request, res: Response) => {
      const { discussionId } = req.params;
      const replies = await storage.getDiscussionReplies(discussionId);
      res.json(replies);
    }),
  );

  // Certifications
  app.get(
    "/api/certifications",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const certifications = await storage.getUserCertifications(userId);
      res.json(certifications);
    }),
  );

  // ============================================================================
  // PAYMENT ROUTES
  // ============================================================================

  // Create an order and initialize payment
  app.post(
    "/api/orders",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(503).json({
          message:
            "Payment system is not configured. Please contact the administrator.",
        });
      }

      const { courseId } = req.body;
      const userId = req.user.claims.sub;

      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const isEnrolled = await storage.isUserEnrolled(userId, courseId);
      if (isEnrolled) {
        return res
          .status(400)
          .json({ message: "Already enrolled in this course" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return res
          .status(400)
          .json({ message: "User email required for payment" });
      }

      const amount = Math.round(parseFloat(course.price) * 100);
      const reference = `course_${courseId}_${userId}_${Date.now()}`;

      const paymentData = {
        email: user.email,
        amount,
        currency: course.currency,
        reference,
        callback_url: `${req.protocol}://${req.get("host")}/payment-success`,
        metadata: {
          courseId,
          userId,
          courseName: course.title,
        },
      };

      const response = await fetch(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        },
      );

      const result = await response.json();

      if (!result.status) {
        throw new Error(result.message || "Payment initialization failed");
      }

      const order = await storage.createOrder({
        userId,
        courseId,
        amount: course.price,
        currency: course.currency,
        status: "pending",
        paystackReference: reference,
      });

      res.json({
        ...order,
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reference: result.data.reference,
        paystackReference: reference, // Ensure frontend field matches
      });
    }),
  );

  // Backward compatibility alias
  app.post("/api/initialize-payment", requireSupabaseAuth, (req, res) => {
    res.redirect(307, "/api/orders");
  });

  app.post(
    "/api/paystack-webhook",
    express.raw({ type: "application/json" }),
    asyncHandler(async (req: Request, res: Response) => {
      if (!PAYSTACK_SECRET_KEY) {
        console.error("Paystack webhook received but SECRET_KEY is missing");
        return res
          .status(503)
          .json({ message: "Payment system is not configured" });
      }

      try {
        const hash = crypto
          .createHmac("sha512", PAYSTACK_SECRET_KEY)
          .update(req.body)
          .digest("hex");
        const signature = req.headers["x-paystack-signature"] as string;

        if (hash !== signature) {
          console.warn("Invalid Paystack signature received");
          return res.status(400).send("Invalid signature");
        }

        const event = JSON.parse(req.body.toString());
        console.log(`Paystack Webhook Event: ${event.event}`, {
          reference: event.data?.reference,
          status: event.data?.status,
        });

        if (event.event === "charge.success") {
          const { reference, metadata } = event.data;
          const { courseId, userId } = metadata;

          if (!courseId || !userId) {
            console.error("Missing metadata in Paystack success event", {
              metadata,
            });
            return res.status(400).json({ message: "Missing metadata" });
          }

          console.log(
            `Processing successful payment for user ${userId}, course ${courseId}`,
          );
          await storage.updateOrderByReference(reference, "completed");
          await storage.enrollUser({ userId, courseId, progress: "0" });
        }

        res.json({ received: true });
      } catch (error) {
        console.error("Error processing Paystack webhook:", error);
        // Still return 200 to Paystack to avoid retries if the signature was valid but processing failed
        res
          .status(200)
          .json({ received: true, error: "Internal processing error" });
      }
    }),
  );

  app.post(
    "/api/verify-payment",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(503).json({
          message:
            "Payment system is not configured. Please contact the administrator.",
        });
      }

      const { reference } = req.body;
      const userId = req.user.claims.sub;

      const response = await fetch(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      const result = await response.json();

      if (result.status && result.data.status === "success") {
        const { metadata } = result.data;
        const { courseId } = metadata;

        await storage.updateOrderByReference(reference, "completed");
        await storage.enrollUser({ userId, courseId, progress: "0" });

        res.json({ success: true, data: result.data });
      } else {
        await storage.updateOrderByReference(reference, "failed");
        res.json({ success: false, message: "Payment verification failed" });
      }
    }),
  );

  app.get(
    "/api/orders",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    }),
  );

  // ============================================================================
  // INSTRUCTOR ROUTES
  // ============================================================================

  app.get(
    "/api/instructor/courses",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const courses = await storage.getInstructorCourses(instructorId);
      res.json(courses);
    }),
  );

  app.get(
    "/api/instructor/stats",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const stats = await storage.getInstructorStats(instructorId);
      res.json(stats);
    }),
  );

  // Instructor routes — real DB data
  app.get(
    "/api/instructor/revenue",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const revenueData =
        await storage.getInstructorMonthlyRevenue(instructorId);
      res.json(revenueData);
    }),
  );

  app.get(
    "/api/instructor/submissions/pending",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const submissions =
        await storage.getInstructorPendingSubmissions(instructorId);
      res.json(submissions);
    }),
  );

  app.get(
    "/api/instructor/questions",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const questions =
        await storage.getInstructorStudentQuestions(instructorId);
      res.json(questions);
    }),
  );

  app.get(
    "/api/instructor/analytics",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const analytics = await storage.getInstructorAnalytics(instructorId);
      res.json(analytics);
    }),
  );

  app.post(
    "/api/instructor/courses",
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

  app.put(
    "/api/instructor/courses/:id",
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

  app.delete(
    "/api/instructor/courses/:id",
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

  // ============================================================================
  // CURRICULUM MANAGEMENT ROUTES (Modules & Lessons)
  // ============================================================================

  // Get course modules with lessons
  app.get(
    "/api/instructor/courses/:courseId/modules",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const { courseId } = req.params;

      const course = await storage.getCourseById(courseId);
      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const modules = await storage.getCourseModules(courseId);
      res.json(modules);
    }),
  );

  // Create a new module
  app.post(
    "/api/instructor/courses/:courseId/modules",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const instructorId = req.user.claims.sub;
      const { courseId } = req.params;

      const course = await storage.getCourseById(courseId);
      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { title, description } = req.body;
      const module = await storage.createModule({
        courseId,
        title,
        description,
        order: 0,
      });
      res.status(201).json(module);
    }),
  );

  // Update a module
  app.put(
    "/api/instructor/modules/:moduleId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { moduleId } = req.params;
      const { title, description, order } = req.body;

      const module = await storage.updateModule(moduleId, {
        title,
        description,
        order,
      });
      res.json(module);
    }),
  );

  // Delete a module
  app.delete(
    "/api/instructor/modules/:moduleId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { moduleId } = req.params;
      await storage.deleteModule(moduleId);
      res.json({ success: true });
    }),
  );

  // Reorder modules
  app.put(
    "/api/instructor/courses/:courseId/modules/reorder",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { courseId } = req.params;
      const { moduleOrder } = req.body;
      await storage.reorderModules(courseId, moduleOrder);
      res.json({ success: true });
    }),
  );

  // Reorder lessons within a module
  app.put(
    "/api/instructor/modules/:moduleId/lessons/reorder",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { moduleId } = req.params;
      const { lessonOrder } = req.body;
      await storage.reorderLessons(moduleId, lessonOrder);
      res.json({ success: true });
    }),
  );

  // Create a new lesson
  app.post(
    "/api/instructor/modules/:moduleId/lessons",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { moduleId } = req.params;
      const { title, description, contentType, videoUrl, duration, content } =
        req.body;

      const lesson = await storage.createLesson({
        moduleId,
        title,
        description,
        contentType,
        videoUrl,
        duration,
        content,
        order: 0,
        isFree: false,
      });
      res.status(201).json(lesson);
    }),
  );

  // Update a lesson
  app.put(
    "/api/instructor/lessons/:lessonId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const updates = req.body;

      const lesson = await storage.updateLesson(lessonId, updates);
      res.json(lesson);
    }),
  );

  // Delete a lesson
  app.delete(
    "/api/instructor/lessons/:lessonId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      await storage.deleteLesson(lessonId);
      res.json({ success: true });
    }),
  );

  // ============================================================================
  // VIDEO & RESOURCE UPLOAD ROUTES
  // ============================================================================

  // Upload video for a lesson
  app.post(
    "/api/instructor/lessons/:lessonId/video",
    requireSupabaseAuth,
    requireInstructor(),
    uploadLimiter,
    videoUpload.single("video"),
    handleUploadError,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const { lessonId } = req.params;
      const videoUrl = getFileUrl(req, req.file.filename, "video");

      // Extract video duration from request body (sent from frontend after processing)
      const duration = req.body.duration ? parseInt(req.body.duration) : null;

      // Update lesson with video URL and duration
      const lesson = await storage.updateLesson(lessonId, {
        videoUrl,
        duration,
      });

      res.json({
        message: "Video uploaded successfully",
        videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        lesson,
      });
    }),
  );

  // Upload resource/attachment for a lesson
  app.post(
    "/api/instructor/lessons/:lessonId/resources",
    requireSupabaseAuth,
    requireInstructor(),
    uploadLimiter,
    documentUpload.single("resource"),
    handleUploadError,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No resource file provided" });
      }

      const { lessonId } = req.params;
      const { title, description } = req.body;

      const fileUrl = getFileUrl(req, req.file.filename, "document");
      const fileExtension =
        req.file.originalname.split(".").pop()?.toLowerCase() || "";

      // Create resource record in database
      const resource = await storage.createCourseResource({
        lessonId,
        title: title || req.file.originalname,
        description,
        fileUrl,
        fileName: req.file.originalname,
        fileType: fileExtension,
        fileSize: req.file.size,
        downloadCount: 0,
      });

      res.status(201).json({
        message: "Resource uploaded successfully",
        resource,
      });
    }),
  );

  // Get resources for a lesson
  app.get(
    "/api/lessons/:lessonId/resources",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const resources = await storage.getLessonResources(lessonId);
      res.json(resources);
    }),
  );

  // Delete a resource
  app.delete(
    "/api/instructor/resources/:resourceId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { resourceId } = req.params;
      await storage.deleteCourseResource(resourceId);
      res.json({ success: true });
    }),
  );

  // ============================================================================
  // OBJECT STORAGE ROUTES (for video uploads to cloud storage)
  // ============================================================================

  // Get presigned URL for uploading video to object storage
  app.post(
    "/api/objects/upload",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    }),
  );

  // Update lesson with video URL after upload to object storage
  app.put(
    "/api/instructor/lessons/:lessonId/video-url",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const { videoUrl, duration } = req.body;

      if (!videoUrl) {
        return res.status(400).json({ error: "videoUrl is required" });
      }

      const userId = req.user.claims.sub;

      try {
        const objectStorageService = new ObjectStorageService();
        // Normalize the object path and set ACL policy
        const normalizedPath =
          await objectStorageService.trySetObjectEntityAclPolicy(videoUrl, {
            owner: userId,
            visibility: "public", // Videos are public so students can view them
          });

        // Update lesson with the normalized video path and duration
        const lesson = await storage.updateLesson(lessonId, {
          videoUrl: normalizedPath,
          duration: duration || null,
        });

        res.json({
          message: "Video URL updated successfully",
          objectPath: normalizedPath,
          lesson,
        });
      } catch (error) {
        console.error("Error updating lesson video URL:", error);
        res.status(500).json({ error: "Failed to update video URL" });
      }
    }),
  );

  // Serve videos from object storage
  app.get(
    "/objects/:objectPath(*)",
    asyncHandler(async (req: Request, res: Response) => {
      const objectStorageService = new ObjectStorageService();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(
          req.path,
        );

        // Videos are public, so we don't need authentication check
        // The ACL policy is set to public when the video is uploaded
        objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        console.error("Error accessing object:", error);
        if (error instanceof ObjectNotFoundError) {
          return res.sendStatus(404);
        }
        return res.sendStatus(500);
      }
    }),
  );

  // ============================================================================
  // QUIZ MANAGEMENT ROUTES
  // ============================================================================

  // Create or update quiz for a lesson
  app.post(
    "/api/instructor/lessons/:lessonId/quiz",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const quizData = req.body;

      const quiz = await storage.createOrUpdateQuiz(lessonId, quizData);
      res.status(201).json(quiz);
    }),
  );

  // Get quiz for a lesson
  app.get(
    "/api/lessons/:lessonId/quiz",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const quizzes = await storage.getLessonQuizzes(lessonId);
      res.json(quizzes?.[0] || null);
    }),
  );

  // Delete quiz
  app.delete(
    "/api/instructor/quizzes/:quizId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { quizId } = req.params;
      await storage.deleteQuiz(quizId);
      res.json({ success: true });
    }),
  );

  // ============================================================================
  // ASSIGNMENT MANAGEMENT ROUTES
  // ============================================================================

  // Create or update assignment for a lesson
  app.post(
    "/api/instructor/lessons/:lessonId/assignment",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const assignmentData = req.body;

      const assignment = await storage.createOrUpdateAssignment(
        lessonId,
        assignmentData,
      );
      res.status(201).json(assignment);
    }),
  );

  // Get assignment for a lesson
  app.get(
    "/api/lessons/:lessonId/assignment",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const assignment = await storage.getAssignmentByLessonId(lessonId);
      res.json(assignment || null);
    }),
  );

  // Delete assignment
  app.delete(
    "/api/instructor/assignments/:assignmentId",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { assignmentId } = req.params;
      await storage.deleteAssignment(assignmentId);
      res.json({ success: true });
    }),
  );

  // ============================================================================
  // COURSE PUBLISHING ROUTES
  // ============================================================================

  // Validate course before publishing
  app.get(
    "/api/instructor/courses/:courseId/validation",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { courseId } = req.params;
      const validation = await storage.validateCourseForPublishing(courseId);
      res.json(validation);
    }),
  );

  // Publish course
  app.post(
    "/api/instructor/courses/:courseId/publish",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { courseId } = req.params;
      const validation = await storage.validateCourseForPublishing(courseId);

      if (!validation.isValid) {
        res.status(400).json({
          error: "Course validation failed",
          validation,
        });
        return;
      }

      await storage.publishCourse(courseId);
      res.json({ success: true, message: "Course published successfully" });
    }),
  );

  // Unpublish course
  app.post(
    "/api/instructor/courses/:courseId/unpublish",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { courseId } = req.params;
      await storage.unpublishCourse(courseId);
      res.json({ success: true, message: "Course unpublished successfully" });
    }),
  );

  // Create or update quiz for a lesson
  app.post(
    "/api/instructor/lessons/:lessonId/quiz",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const quizData = req.body;

      const quiz = await storage.createOrUpdateQuiz(lessonId, quizData);
      res.json(quiz);
    }),
  );

  // Create or update assignment for a lesson
  app.post(
    "/api/instructor/lessons/:lessonId/assignment",
    requireSupabaseAuth,
    requireInstructor(),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { lessonId } = req.params;
      const assignmentData = req.body;

      const assignment = await storage.createOrUpdateAssignment(
        lessonId,
        assignmentData,
      );
      res.json(assignment);
    }),
  );

  // Quiz routes
  app.get(
    "/api/courses/:courseId/quizzes",
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

  app.get(
    "/api/quizzes/:quizId/attempts",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { quizId } = req.params;
      const userId = req.user.claims.sub;

      const attempts = await storage.getQuizAttempts(userId, quizId);
      res.json(attempts);
    }),
  );

  // Instructor application routes
  app.post(
    "/api/instructor-applications",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const applicationData = insertInstructorApplicationSchema.parse({
        ...req.body,
        userId,
      });

      const existingApplication =
        await storage.getInstructorApplicationByUserId(userId);
      if (
        existingApplication &&
        (existingApplication.status === "pending" ||
          existingApplication.status === "approved")
      ) {
        return res.status(400).json({
          message: `You already have a ${existingApplication.status} instructor application.`,
        });
      }

      const application =
        await storage.createInstructorApplication(applicationData);
      res.status(201).json(application);
    }),
  );

  app.get(
    "/api/instructor-applications/my-application",
    requireSupabaseAuth,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const userId = req.user.claims.sub;
      const application =
        await storage.getInstructorApplicationByUserId(userId);

      if (!application) {
        return res.status(404).json({ message: "No application found" });
      }

      res.json(application);
    }),
  );

  // Admin routes
  app.get(
    "/api/admin/stats",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const stats = await storage.getAdminStats();
      res.json(stats);
    }),
  );

  app.get(
    "/api/admin/instructor-applications",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const { status, page = "1", limit = "20" } = req.query;
      const applications = await storage.getInstructorApplications({
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(applications);
    }),
  );

  app.put(
    "/api/admin/instructor-applications/:id",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: AuthRequest, res: Response) => {
      const { id } = req.params;
      const { status, comments } = req.body;
      const reviewerId = req.user.claims.sub;

      if (!["approved", "rejected"].includes(status)) {
        return res
          .status(400)
          .json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const updatedApplication = await storage.updateInstructorApplication(id, {
        status,
        reviewComments: comments,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      });

      if (
        status === "approved" &&
        updatedApplication &&
        updatedApplication.userId
      ) {
        await storage.updateUserRole(updatedApplication.userId, "instructor");
      }

      res.json(updatedApplication);
    }),
  );

  app.get(
    "/api/admin/users",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const { page = "1", limit = "20", search, role } = req.query;
      const users = await storage.getUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        role: role as string,
      });
      res.json(users);
    }),
  );

  app.get(
    "/api/admin/courses",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const { page = "1", limit = "20", status, instructor } = req.query;
      const courses = await storage.getCoursesForAdmin({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        instructor: instructor as string,
      });
      res.json(courses);
    }),
  );

  app.put(
    "/api/admin/users/:id/role",
    requireSupabaseAuth,
    requireRole("admin"),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!["student", "instructor", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      res.json(user);
    }),
  );

  // ============================================================================
  // CONTACT FORM ROUTE
  // ============================================================================

  app.post(
    "/api/contact",
    asyncHandler(async (req: Request, res: Response) => {
      const { name, email, subject, message } = req.body;

      // Validate required fields
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      // Validate message length
      if (message.length < 10) {
        return res
          .status(400)
          .json({ message: "Message must be at least 10 characters" });
      }

      // Log contact form submission (in production, integrate with email service like Resend)
      console.log("Contact form submission:", {
        name,
        email,
        subject,
        message:
          message.substring(0, 100) + (message.length > 100 ? "..." : ""),
        timestamp: new Date().toISOString(),
      });

      // TODO: Integrate with email service (e.g., Resend) to send actual emails
      // For now, just return success
      res.json({
        success: true,
        message: "Message received. We will get back to you soon!",
      });
    }),
  );

  // ============================================================================
  // CERTIFICATE SETUP ROUTE
  // ============================================================================

  app.get(
    "/setup-members",
    asyncHandler(async (req: Request, res: Response) => {
      try {
        console.log('Inspecting existing members table structure...');
        
        // First, try to get table structure by attempting a simple query
        let tableStructure = '';
        try {
          const { data: testData, error: testError } = await supabaseAdmin
            .from('members')
            .select('*')
            .limit(1);
          
          if (testError) {
            console.error('Table query error:', testError);
            tableStructure = 'Error accessing table: ' + testError.message;
          } else if (testData && testData.length > 0) {
            const columns = Object.keys(testData[0]);
            tableStructure = 'Columns found: ' + columns.join(', ');
            console.log('Table columns:', columns);
            
            // First check if there are existing members, if so use their IDs
            const { data: existingMembers, error: existingError } = await supabaseAdmin
              .from('members')
              .select('id, full_name, membership_level, issue_date, expiry_date')
              .limit(5);
            
            if (existingError) {
              console.error('Error checking existing members:', existingError);
              tableStructure = 'Error checking existing members: ' + existingError.message;
            } else if (existingMembers && existingMembers.length > 0) {
              console.log('Found existing members:', existingMembers.length);
              tableStructure = 'Existing members found: ' + existingMembers.map(m => m.id + ' - ' + m.full_name).join(', ');
              
              // Use existing member data for certificate testing
              let successCount = existingMembers.length;
              let errorCount = 0;
              
              for (const member of existingMembers) {
                console.log('Using existing member:', member.id, '-', member.full_name);
              }
              
              if (successCount > 0) {
                res.send(`
                  <html>
                  <head><title>Members Found</title></head>
                  <body style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h1 style="color: #8B0000;">Members Table Ready</h1>
                    <p>Found ${successCount} existing members in database</p>
                    <p>${tableStructure}</p>
                    <p><a href="/certificate/${existingMembers[0].id}">Test Certificate with ${existingMembers[0].full_name}</a></p>
                    <p><a href="/">Back to Home</a></p>
                  </body>
                  </html>
                `);
                return;
              } else {
                res.status(500).send('No existing members found');
                return;
              }
            } else {
              tableStructure = 'No existing members found';
              res.send(`
                <html>
                <head><title>No Members</title></head>
                <body style="font-family: Arial; text-align: center; margin-top: 50px;">
                  <h1 style="color: #8B0000;">No Members Found</h1>
                  <p>Add members via the admin dashboard first.</p>
                  <p><a href="/">Back to Home</a></p>
                </body>
                </html>
              `);
              return;
            }
          } else {
            tableStructure = 'Table exists but is empty';
          }
        } catch (queryError: any) {
          tableStructure = 'Query failed: ' + queryError.message;
        }
        
        res.send(`
          <html>
          <head><title>Table Inspection</title></head>
          <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h1 style="color: #8B0000;">Table Structure Analysis</h1>
            <p>${tableStructure}</p>
            <p><a href="/">Back to Home</a></p>
          </body>
          </html>
        `);
        
      } catch (err: any) {
        console.error('Setup error:', err.message);
        res.status(500).send('Setup failed: ' + err.message);
      }
    }),
  );

  // ============================================================================
  // CERTIFICATE ROUTES
  // ============================================================================

  app.get(
    "/certificate/:memberId",
    asyncHandler(async (req: Request, res: Response) => {
      const { memberId } = req.params;

      // Validate member ID
      if (!memberId || !memberId.trim()) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h1 style="color: #8B0000;">Error</h1>
            <p>Invalid member ID</p>
            <a href="/" style="background: #8B0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Back to Home</a>
          </body>
          </html>
        `);
      }

      try {
        // Fetch member from Supabase
        const { data: member, error } = await supabaseAdmin
          .from('members')
          .select('*')
          .eq('id', memberId)
          .single();

        if (error || !member) {
          // Member not found in database
          return res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Member Not Found</title></head>
            <body style="font-family: Arial; text-align: center; margin-top: 50px;">
              <h1 style="color: #8B0000;">Member Not Found</h1>
              <p>Member with ID ${memberId} not found in database</p>
              <p>Please check the member ID or contact administrator</p>
              <a href="/" style="background: #8B0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Back to Home</a>
            </body>
            </html>
          `);
        }

        // Handle actual table structure
        const memberData: any = {
          id: member.id,
          name: member.full_name || member.name,
          membership_type: member.membership_level || member.type,
          issue_date: member.issue_date,
          expiry_date: member.expiry_date
        };

        return generateCertificate(res, memberData);

      } catch (err) {
        console.error('Error generating certificate:', err);
        return res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Server Error</title></head>
          <body style="font-family: Arial; text-align: center; margin-top: 50px;">
            <h1 style="color: #8B0000;">Server Error</h1>
            <p>Unable to generate certificate</p>
            <a href="/" style="background: #8B0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Back to Home</a>
          </body>
          </html>
        `);
      }
    }),
  );

  // Helper function to generate certificate HTML
  function generateCertificate(res: Response, member: any) {
    const membershipLabels: Record<string, string> = {
      "associate": "Associate Member",
      "member": "Member", 
      "fellow": "Fellow Member"
    };

    const membershipType = membershipLabels[member.membership_type] || "Member";
    const article = membershipType.startsWith('A') ? 'n' : '';

    const certificateHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CIMA Certificate of Membership</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato&display=swap" rel="stylesheet">
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      background: #f0f0f0;
      font-family: 'Lato', sans-serif;
    }

    .certificate {
      width: 210mm;
      min-height: 297mm;
      background: white;
      margin: 0 auto;
      padding: 20mm 15mm;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .no-print { 
      text-align: center; 
      padding: 20px; 
      background: white;
      margin-bottom: 20px;
    }

    .no-print button {
      background: #8B0000;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }

    .no-print button:hover {
      background: #660000;
    }

    .logo { width: 130px; margin-bottom: 10px; }

    .org-name { font-size: 20px; font-family: 'Playfair Display', serif; }
    .org-sub  { font-size: 14px; font-weight: bold; }

    .cert-title {
      font-size: 58px;
      color: #8B0000;
      font-family: 'Playfair Display', serif;
      line-height: 1.2;
      margin: 10px 0;
    }

    .certify-text  { font-size: 16px; font-style: italic; }
    .member-name   { font-size: 32px; font-family: 'Playfair Display', serif; }
    .member-status { font-size: 16px; }
    .valid-until   { font-size: 18px; }
    .seal-text     { font-size: 16px; line-height: 1.6; }

    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-top: 20px;
    }

    .sig-block { text-align: left; font-size: 13px; }
    .signature { width: 120px; display: block; margin-bottom: 5px; }
    .seal      { width: 130px; }

    .issue-block { text-align: right; font-size: 14px; line-height: 1.8; }

    .footer-note {
      font-size: 11px;
      color: #555;
      margin-top: auto;
      padding-top: 20px;
    }

    /* ---- PRINT STYLES ---- */
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }

      body { background: white; }

      .no-print { display: none !important; }

      .certificate {
        width: 100%;
        min-height: 100vh;
        padding: 15mm 12mm;
        box-shadow: none;
      }
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script>
    async function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Load images
      const loadImage = (url) => fetch(url).then(r => r.blob()).then(b => new Promise((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.readAsDataURL(b);
      }));
      
      try {
        const [crest, seal, sig] = await Promise.all([
          loadImage('/images/cima_logo.png'),
          loadImage('/images/cima_seal.png'),
          loadImage('/images/signature.png')
        ]);
        
        const pw = 210;
        const level = { title: 'Certificate of\nMembership', description: 'is a${article} ${membershipType} of the Center' };
        
        // White background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 297, 'F');
        
        // Crest
        doc.addImage(crest, 'PNG', 75, 18, 60, 50);
        
        // Organization
        doc.setFont('times', 'normal');
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('The Center for International', pw/2, 78, { align: 'center' });
        doc.text('Mediators and Arbitrators', pw/2, 87, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text('England & Wales', pw/2, 96, { align: 'center' });
        
        // Title
        doc.setFont('times', 'bolditalic');
        doc.setFontSize(42);
        doc.setTextColor(185, 28, 28);
        doc.text('Certificate of', pw/2, 118, { align: 'center' });
        doc.text('Membership', pw/2, 136, { align: 'center' });
        
        // Certify text
        doc.setFont('times', 'italic');
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text('This is to certify that', pw/2, 154, { align: 'center' });
        
        // Member name
        doc.setFont('times', 'normal');
        doc.setFontSize(32);
        doc.setTextColor(30, 30, 30);
        doc.text('${member.name}', pw/2, 172, { align: 'center' });
        
        // Description
        doc.setFont('times', 'italic');
        doc.setFontSize(16);
        doc.text('is a${article} ${membershipType} of the Center', pw/2, 186, { align: 'center' });
        
        // Validity
        doc.text('This certificate is valid until ${member.expiry_date}', pw/2, 200, { align: 'center' });
        
        // Seal text
        doc.setFontSize(14);
        doc.text('Given under the seal of the Center for', pw/2, 216, { align: 'center' });
        doc.text('International Mediators and Arbitrators', pw/2, 224, { align: 'center' });
        
        // Bottom section
        const bottomY = 248;
        
        // Signature
        doc.addImage(sig, 'PNG', 25, bottomY - 22, 40, 20);
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text('Francesco Campagna FCIMArb', 45, bottomY, { align: 'center' });
        doc.setFont('times', 'bolditalic');
        doc.text('President', 45, bottomY + 5, { align: 'center' });
        
        // Seal
        doc.addImage(seal, 'PNG', 84, bottomY - 22, 42, 42);
        
        // Issue date and ID
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text('Issued on', 170, bottomY - 10, { align: 'center' });
        doc.text('${member.issue_date}', 170, bottomY - 4, { align: 'center' });
        
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.text('Member ID No:', 170, bottomY + 6, { align: 'center' });
        doc.setFontSize(15);
        doc.text('${member.id}', 170, bottomY + 13, { align: 'center' });
        
        // Footer
        doc.setFont('times', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(185, 28, 28);
        doc.text('This certificate must be returned to CIMA on cessation of Membership', pw/2, 278, { align: 'center' });
        doc.setTextColor(100, 100, 100);
        doc.text('Company No.: 16140063 Registered in England & Wales', pw/2, 283, { align: 'center' });
        
        doc.save('CIMA_Certificate_${member.id}.pdf');
      } catch (err) {
        console.error('PDF generation failed:', err);
        alert('PDF download failed. Please use the Print button instead.');
      }
    }
  </script>
</head>
<body>
  <div class="no-print" style="display: flex; gap: 10px; justify-content: center; padding: 20px; background: white; margin-bottom: 20px;">
    <button onclick="window.print()" style="background: #8B0000; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">🖨️ Print Certificate</button>
    <button onclick="downloadPDF()" style="background: #1a365d; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">⬇️ Download PDF</button>
  </div>

  <div class="certificate">
    <img src="/images/cima_logo.png" class="logo" alt="CIMA Logo">

    <p class="org-name">The Center for International<br>Mediators and Arbitrators</p>
    <p class="org-sub">England &amp; Wales</p>

    <h1 class="cert-title">Certificate of<br>Membership</h1>

    <p class="certify-text">This is to certify that</p>

    <h2 class="member-name">${member.name}</h2>
    <p class="member-status">is a${article} ${membershipType} of the Center</p>

    <p class="valid-until">This certificate is valid until ${member.expiry_date}</p>

    <p class="seal-text">Given under the seal of the Center for<br>International Mediators and Arbitrators</p>

    <div class="footer-row">
      <div class="sig-block">
        <img src="/images/signature.png" class="signature" alt="Signature">
        <p>Francesco Campagna FCIMArb</p>
        <p><em>President</em></p>
      </div>

      <img src="/images/cima_seal.png" class="seal" alt="CIMA Seal">

      <div class="issue-block">
        <p>Issued on<br>${member.issue_date}</p>
        <p><strong>Member ID No:<br>${member.id}</strong></p>
      </div>
    </div>

    <p class="footer-note">This certificate must be returned to CIMA on cessation of Membership<br>
    Company No.: 16140063 Registered in England &amp; Wales</p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(certificateHTML);
  }

  // Error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
