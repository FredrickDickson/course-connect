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
import { isAuthenticated } from "./sessionAuth";
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
import {
  insertCourseSchema,
  insertEnrollmentSchema,
  insertReviewSchema,
  insertDiscussionSchema,
  insertReplySchema,
  insertProgressSchema,
  insertInstructorApplicationSchema,
} from "@shared/schema";

// Define authenticated request type
interface AuthRequest extends Request {
  user: {
    claims: {
      sub: string;
    }
  }
}

// Paystack payment gateway configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Registers all API routes and middleware with the Express application
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Apply security middleware in production only
  if (process.env.NODE_ENV === 'production') {
    app.use(securityMiddleware);
  }
  
  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // ============================================================================
  // ADMIN ROUTES
  // ============================================================================

  app.post('/api/admin/setup', asyncHandler(async (req: Request, res: Response) => {
    const { email, setupKey } = req.body;
    
    const validSetupKey = process.env.SETUP_KEY || "CIMA_ADMIN_SETUP_2024";
    
    if (setupKey !== validSetupKey) {
      return res.status(401).json({ message: "Invalid setup key" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    const updatedUser = await storage.updateUserRole(user.id, 'admin');
    
    res.json({ 
      message: "Admin setup successful", 
      user: { 
        id: updatedUser.id, 
        email: updatedUser.email, 
        role: updatedUser.role 
      } 
    });
  }));

  app.post('/api/admin/check-user', asyncHandler(async (req: Request, res: Response) => {
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
            role: user.role 
          } 
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      res.json({ exists: false, error: 'Database connection issue' });
    }
  }));

  app.post('/api/admin/create-user', asyncHandler(async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Not available in production" });
    }
    
    const { email, firstName, lastName, setupKey } = req.body;
    
    const validSetupKey = process.env.SETUP_KEY || "CIMA_ADMIN_SETUP_2024";
    if (setupKey !== validSetupKey) {
      return res.status(401).json({ message: "Invalid setup key" });
    }
    
    try {
      const newUser = await storage.upsertUser({
        id: `manual_${Date.now()}`,
        email: email,
        firstName: firstName || 'Admin',
        lastName: lastName || 'User',
        role: 'admin'
      });
      
      res.json({ 
        message: "User created and admin access granted", 
        user: { 
          id: newUser.id, 
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to create user", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }));

  app.get('/api/debug/status', asyncHandler(async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Not available in production" });
    }
    
    try {
      const users = await storage.getUsers({ limit: 10 });
      res.json({
        database_status: 'connected',
        user_count: users.length,
        recent_users: users.map(u => ({ id: u.id, email: u.email, role: u.role }))
      });
    } catch (error) {
      res.json({
        database_status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        using_memory_sessions: true
      });
    }
  }));

  // ============================================================================
  // USER & AUTHENTICATION ROUTES
  // ============================================================================

  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  }));

  app.put('/api/auth/profile', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { bio, country, timezone } = req.body;
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await storage.upsertUser({
      id: userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      bio: bio || user.bio,
      country: country || user.country,
      timezone: timezone || user.timezone,
    });
    
    res.json(updatedUser);
  }));

  app.post('/api/auth/profile/image', 
    isAuthenticated, 
    uploadLimiter,
    profileImageUpload.single('image'),
    handleUploadError,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const userId = req.user.claims.sub;
      const imageUrl = getFileUrl(req, req.file.filename, 'image');
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updatedUser = await storage.upsertUser({
        ...user,
        profileImageUrl: imageUrl,
      });
      
      res.json({ 
        message: 'Profile image updated successfully',
        profileImageUrl: imageUrl,
        user: updatedUser 
      });
    })
  );

  // ============================================================================
  // CATEGORY ROUTES
  // ============================================================================

  app.get('/api/categories', asyncHandler(async (req: Request, res: Response) => {
    const categories = await storage.getCategories();
    res.json(categories);
  }));

  app.post('/api/categories', isAuthenticated, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const { name, description, slug } = req.body;
    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
    }
    if (!slug || slug.length < 2 || slug.length > 100) {
      return res.status(400).json({ message: "Slug must be between 2 and 100 characters" });
    }
    const category = await storage.createCategory({ name, description, slug });
    res.status(201).json(category);
  }));

  // ============================================================================
  // COURSE ROUTES
  // ============================================================================

  app.get('/api/courses', asyncHandler(async (req: Request, res: Response) => {
    const courses = await storage.getCourses();
    res.json(courses);
  }));

  app.get('/api/courses/featured', asyncHandler(async (req: Request, res: Response) => {
    const courses = await storage.getFeaturedCourses();
    res.json(courses);
  }));

  app.get('/api/courses/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = {
      totalCourses: 6,
      totalStudents: 5000,
      averageRating: 4.8,
      totalHours: 120
    };
    res.json(stats);
  }));

  app.get('/api/courses/:id', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const course = await storage.getCourseById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    res.json(course);
  }));

  // ============================================================================
  // FILE UPLOAD ROUTES
  // ============================================================================

  app.post('/api/upload/video', 
    isAuthenticated,
    requireInstructor(),
    uploadLimiter,
    videoUpload.single('video'),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }
      
      const videoUrl = getFileUrl(req, req.file.filename, 'video');
      res.json({ 
        message: 'Video uploaded successfully',
        videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        duration: null
      });
    })
  );

  app.post('/api/upload/image', 
    isAuthenticated,
    uploadLimiter,
    imageUpload.single('image'),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const imageUrl = getFileUrl(req, req.file.filename, 'image');
      res.json({ 
        message: 'Image uploaded successfully',
        imageUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    })
  );

  app.post('/api/upload/document', 
    isAuthenticated,
    uploadLimiter,
    documentUpload.single('document'),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No document file provided' });
      }
      
      const documentUrl = getFileUrl(req, req.file.filename, 'document');
      res.json({ 
        message: 'Document uploaded successfully',
        documentUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    })
  );

  app.post('/api/upload/course-content', 
    isAuthenticated,
    requireInstructor(),
    uploadLimiter,
    courseContentUpload.array('files', 10),
    handleUploadError,
    asyncHandler(async (req: Request, res: Response) => {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }
      
      const uploadedFiles = files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        url: getFileUrl(req, file.filename, file.fieldname === 'video' ? 'video' : 'image'),
        size: file.size,
        type: file.mimetype
      }));
      
      res.json({ 
        message: 'Files uploaded successfully',
        files: uploadedFiles
      });
    })
  );

  // ============================================================================
  // ENROLLMENT ROUTES  
  // ============================================================================

  app.post('/api/enrollments', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const enrollmentData = insertEnrollmentSchema.parse({ ...req.body, userId });
    
    const isEnrolled = await storage.isUserEnrolled(userId, enrollmentData.courseId || '');
    if (isEnrolled) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    const enrollment = await storage.enrollUser(enrollmentData);
    res.json(enrollment);
  }));

  app.get('/api/enrollments', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const enrollments = await storage.getUserEnrollments(userId);
    res.json(enrollments);
  }));

  app.get('/api/enrollments/check/:courseId', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { courseId } = req.params;
    const isEnrolled = await storage.isUserEnrolled(userId, courseId);
    res.json({ isEnrolled });
  }));

  // Progress tracking
  app.post('/api/progress', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const progressData = insertProgressSchema.parse({ ...req.body, userId });
    const progress = await storage.updateProgress(progressData);
    res.json(progress);
  }));

  app.get('/api/progress/:courseId', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { courseId } = req.params;
    const progress = await storage.getUserProgress(userId, courseId);
    res.json(progress);
  }));

  app.get('/api/progress/overview', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const overview = await storage.getUserOverallProgress(userId);
    res.json(overview);
  }));

  // Enhanced student dashboard endpoints
  app.get('/api/assignments', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const assignments = [
      {
        id: '1',
        title: 'Case Study Analysis: Cross-Border Dispute',
        course: { title: 'Cross-Border M&A Dispute Resolution' },
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        submissionStatus: 'pending'
      }
    ];
    res.json(assignments);
  }));

  app.get('/api/quizzes/pending', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizzes = [
      {
        id: '1',
        title: 'Module 2 Knowledge Check',
        course: { title: 'International Arbitration Fundamentals' },
        questionCount: 15,
        timeLimit: 30
      }
    ];
    res.json(quizzes);
  }));

  app.get('/api/recommendations', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const recommendations = [
      {
        id: '5',
        title: 'Advanced Arbitration Techniques',
        thumbnailUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216',
        avgRating: 4.8,
        matchScore: 92
      }
    ];
    res.json(recommendations);
  }));

  app.get('/api/resources/downloadable', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const resources = [
      { id: '1', title: 'ADR Case Study Templates', type: 'pdf' },
      { id: '2', title: 'Arbitration Clause Library', type: 'docx' }
    ];
    res.json(resources);
  }));

  // Reviews
  app.post('/api/reviews', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const reviewData = insertReviewSchema.parse({ ...req.body, userId });
    const review = await storage.createReview(reviewData);
    res.json(review);
  }));

  app.get('/api/reviews/:courseId', asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const reviews = await storage.getCourseReviews(courseId);
    res.json(reviews);
  }));

  // ============================================================================
  // DISCUSSION & COMMUNITY ROUTES
  // ============================================================================

  app.post('/api/discussions', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const discussionData = insertDiscussionSchema.parse({ ...req.body, userId });
    const discussion = await storage.createDiscussion(discussionData);
    res.json(discussion);
  }));

  app.get('/api/discussions/:courseId', asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const discussions = await storage.getCourseDiscussions(courseId);
    res.json(discussions);
  }));

  app.post('/api/replies', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const replyData = insertReplySchema.parse({ ...req.body, userId });
    const reply = await storage.createReply(replyData);
    res.json(reply);
  }));

  app.get('/api/replies/:discussionId', asyncHandler(async (req: Request, res: Response) => {
    const { discussionId } = req.params;
    const replies = await storage.getDiscussionReplies(discussionId);
    res.json(replies);
  }));

  // Certifications
  app.get('/api/certifications', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const certifications = await storage.getUserCertifications(userId);
    res.json(certifications);
  }));

  // ============================================================================
  // PAYMENT ROUTES
  // ============================================================================

  app.post("/api/initialize-payment", isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ message: "Payment system is not configured. Please contact the administrator." });
    }

    const { courseId } = req.body;
    const userId = req.user.claims.sub;

    const course = await storage.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isEnrolled = await storage.isUserEnrolled(userId, courseId);
    if (isEnrolled) {
      return res.status(400).json({ message: "Already enrolled in this course" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.email) {
      return res.status(400).json({ message: "User email required for payment" });
    }

    const amount = Math.round(parseFloat(course.price) * 100);
    const reference = `course_${courseId}_${userId}_${Date.now()}`;

    const paymentData = {
      email: user.email,
      amount,
      currency: course.currency,
      reference,
      callback_url: `${req.protocol}://${req.get('host')}/payment-success`,
      metadata: {
        courseId,
        userId,
        courseName: course.title
      }
    };

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!result.status) {
      throw new Error(result.message || 'Payment initialization failed');
    }

    await storage.createOrder({
      userId,
      courseId,
      amount: course.price,
      currency: course.currency,
      status: 'pending',
      paystackReference: reference,
    });

    res.json({ 
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      reference: result.data.reference
    });
  }));

  app.post('/api/paystack-webhook', express.raw({type: 'application/json'}), asyncHandler(async (req: Request, res: Response) => {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ message: "Payment system is not configured" });
    }

    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(req.body).digest('hex');
    const signature = req.headers['x-paystack-signature'] as string;

    if (hash !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const { courseId, userId } = metadata;

      await storage.updateOrderByReference(reference, 'completed');
      await storage.enrollUser({ userId, courseId });
    }

    res.json({received: true});
  }));

  app.post('/api/verify-payment', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ message: "Payment system is not configured. Please contact the administrator." });
    }

    const { reference } = req.body;
    const userId = req.user.claims.sub;

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
      }
    });

    const result = await response.json();

    if (result.status && result.data.status === 'success') {
      const { metadata } = result.data;
      const { courseId } = metadata;

      await storage.updateOrderByReference(reference, 'completed');
      await storage.enrollUser({ userId, courseId });

      res.json({ success: true, data: result.data });
    } else {
      await storage.updateOrderByReference(reference, 'failed');
      res.json({ success: false, message: 'Payment verification failed' });
    }
  }));

  app.get('/api/orders', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const orders = await storage.getUserOrders(userId);
    res.json(orders);
  }));

  // ============================================================================
  // INSTRUCTOR ROUTES
  // ============================================================================

  app.get('/api/instructor/courses', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const courses = await storage.getInstructorCourses(instructorId);
    res.json(courses);
  }));

  app.get('/api/instructor/stats', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const stats = await storage.getInstructorStats(instructorId);
    res.json(stats);
  }));

  app.get('/api/instructor/revenue', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const revenueData = [
      { month: 'Jan', amount: 1890 },
      { month: 'Feb', amount: 2100 },
      { month: 'Mar', amount: 2450 }
    ];
    res.json(revenueData);
  }));

  app.get('/api/instructor/submissions/pending', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const submissions = [
      {
        id: '1',
        assignment: { title: 'Case Study Analysis' },
        student: { firstName: 'Sarah', lastName: 'Johnson' },
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(submissions);
  }));

  app.get('/api/instructor/questions', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const questions = [
      {
        id: '1',
        content: 'Can you clarify the difference between arbitration and mediation?',
        student: { firstName: 'Emma', lastName: 'Davis' },
        course: { title: 'Cross-Border M&A Dispute Resolution' },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(questions);
  }));

  app.get('/api/instructor/analytics', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const analytics = [
      {
        id: '1',
        title: 'Cross-Border M&A Dispute Resolution',
        enrollmentCount: 45,
        avgRating: 4.8,
        revenue: 890,
        completionRate: 82
      }
    ];
    res.json(analytics);
  }));

  app.post('/api/instructor/courses', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const courseData = insertCourseSchema.parse({ ...req.body, instructorId });
    const course = await storage.createCourse(courseData);
    res.json(course);
  }));

  app.put('/api/instructor/courses/:id', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const { id } = req.params;
    
    const course = await storage.getCourseById(id);
    if (!course || course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updates = insertCourseSchema.partial().parse(req.body);
    const updatedCourse = await storage.updateCourse(id, updates);
    res.json(updatedCourse);
  }));

  app.delete('/api/instructor/courses/:id', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const { id } = req.params;
    
    const course = await storage.getCourseById(id);
    if (!course || course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await storage.deleteCourse(id);
    res.json({ success: true });
  }));

  // ============================================================================
  // CURRICULUM MANAGEMENT ROUTES (Modules & Lessons)
  // ============================================================================

  // Get course modules with lessons
  app.get('/api/instructor/courses/:courseId/modules', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const { courseId } = req.params;
    
    const course = await storage.getCourseById(courseId);
    if (!course || course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const modules = await storage.getCourseModules(courseId);
    res.json(modules);
  }));

  // Create a new module
  app.post('/api/instructor/courses/:courseId/modules', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const instructorId = req.user.claims.sub;
    const { courseId } = req.params;
    
    const course = await storage.getCourseById(courseId);
    if (!course || course.instructorId !== instructorId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { title, description } = req.body;
    const module = await storage.createModule({ courseId, title, description, order: 0 });
    res.status(201).json(module);
  }));

  // Update a module
  app.put('/api/instructor/modules/:moduleId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { moduleId } = req.params;
    const { title, description, order } = req.body;
    
    const module = await storage.updateModule(moduleId, { title, description, order });
    res.json(module);
  }));

  // Delete a module
  app.delete('/api/instructor/modules/:moduleId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { moduleId } = req.params;
    await storage.deleteModule(moduleId);
    res.json({ success: true });
  }));

  // Reorder modules
  app.put('/api/instructor/courses/:courseId/modules/reorder', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const { moduleOrder } = req.body;
    await storage.reorderModules(courseId, moduleOrder);
    res.json({ success: true });
  }));

  // Reorder lessons within a module
  app.put('/api/instructor/modules/:moduleId/lessons/reorder', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { moduleId } = req.params;
    const { lessonOrder } = req.body;
    await storage.reorderLessons(moduleId, lessonOrder);
    res.json({ success: true });
  }));

  // Create a new lesson
  app.post('/api/instructor/modules/:moduleId/lessons', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { moduleId } = req.params;
    const { title, description, contentType, videoUrl, duration, content } = req.body;
    
    const lesson = await storage.createLesson({ 
      moduleId, 
      title, 
      description, 
      contentType, 
      videoUrl, 
      duration,
      content,
      order: 0 
    });
    res.status(201).json(lesson);
  }));

  // Update a lesson
  app.put('/api/instructor/lessons/:lessonId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const updates = req.body;
    
    const lesson = await storage.updateLesson(lessonId, updates);
    res.json(lesson);
  }));

  // Delete a lesson
  app.delete('/api/instructor/lessons/:lessonId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    await storage.deleteLesson(lessonId);
    res.json({ success: true });
  }));

  // ============================================================================
  // VIDEO & RESOURCE UPLOAD ROUTES
  // ============================================================================

  // Upload video for a lesson
  app.post('/api/instructor/lessons/:lessonId/video',
    isAuthenticated,
    requireInstructor(),
    uploadLimiter,
    videoUpload.single('video'),
    handleUploadError,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      const { lessonId } = req.params;
      const videoUrl = getFileUrl(req, req.file.filename, 'video');
      
      // Extract video duration from request body (sent from frontend after processing)
      const duration = req.body.duration ? parseInt(req.body.duration) : null;

      // Update lesson with video URL and duration
      const lesson = await storage.updateLesson(lessonId, {
        videoUrl,
        duration,
      });

      res.json({
        message: 'Video uploaded successfully',
        videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        lesson,
      });
    })
  );

  // Upload resource/attachment for a lesson
  app.post('/api/instructor/lessons/:lessonId/resources',
    isAuthenticated,
    requireInstructor(),
    uploadLimiter,
    documentUpload.single('resource'),
    handleUploadError,
    asyncHandler(async (req: AuthRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No resource file provided' });
      }

      const { lessonId } = req.params;
      const { title, description } = req.body;
      
      const fileUrl = getFileUrl(req, req.file.filename, 'document');
      const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase() || '';

      // Create resource record in database
      const resource = await storage.createCourseResource({
        lessonId,
        title: title || req.file.originalname,
        description,
        fileUrl,
        fileName: req.file.originalname,
        fileType: fileExtension,
        fileSize: req.file.size,
      });

      res.status(201).json({
        message: 'Resource uploaded successfully',
        resource,
      });
    })
  );

  // Get resources for a lesson
  app.get('/api/lessons/:lessonId/resources', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const resources = await storage.getLessonResources(lessonId);
    res.json(resources);
  }));

  // Delete a resource
  app.delete('/api/instructor/resources/:resourceId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { resourceId } = req.params;
    await storage.deleteCourseResource(resourceId);
    res.json({ success: true });
  }));

  // ============================================================================
  // QUIZ MANAGEMENT ROUTES
  // ============================================================================

  // Create or update quiz for a lesson
  app.post('/api/instructor/lessons/:lessonId/quiz', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const quizData = req.body;

    const quiz = await storage.createOrUpdateQuiz(lessonId, quizData);
    res.status(201).json(quiz);
  }));

  // Get quiz for a lesson
  app.get('/api/lessons/:lessonId/quiz', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const quiz = await storage.getQuizByLessonId(lessonId);
    res.json(quiz);
  }));

  // Delete quiz
  app.delete('/api/instructor/quizzes/:quizId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quizId } = req.params;
    await storage.deleteQuiz(quizId);
    res.json({ success: true });
  }));

  // ============================================================================
  // ASSIGNMENT MANAGEMENT ROUTES
  // ============================================================================

  // Create or update assignment for a lesson
  app.post('/api/instructor/lessons/:lessonId/assignment', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const assignmentData = req.body;

    const assignment = await storage.createOrUpdateAssignment(lessonId, assignmentData);
    res.status(201).json(assignment);
  }));

  // Get assignment for a lesson
  app.get('/api/lessons/:lessonId/assignment', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { lessonId } = req.params;
    const assignment = await storage.getAssignmentByLessonId(lessonId);
    res.json(assignment);
  }));

  // Delete assignment
  app.delete('/api/instructor/assignments/:assignmentId', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { assignmentId } = req.params;
    await storage.deleteAssignment(assignmentId);
    res.json({ success: true });
  }));

  // ============================================================================
  // COURSE PUBLISHING ROUTES
  // ============================================================================

  // Validate course before publishing
  app.get('/api/instructor/courses/:courseId/validation', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const validation = await storage.validateCourseForPublishing(courseId);
    res.json(validation);
  }));

  // Publish course
  app.post('/api/instructor/courses/:courseId/publish', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const validation = await storage.validateCourseForPublishing(courseId);
    
    if (!validation.isValid) {
      res.status(400).json({ 
        error: 'Course validation failed', 
        validation 
      });
      return;
    }

    await storage.publishCourse(courseId);
    res.json({ success: true, message: 'Course published successfully' });
  }));

  // Unpublish course
  app.post('/api/instructor/courses/:courseId/unpublish', isAuthenticated, requireInstructor(), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    await storage.unpublishCourse(courseId);
    res.json({ success: true, message: 'Course unpublished successfully' });
  }));

  // Quiz routes
  app.get('/api/courses/:courseId/quizzes', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user.claims.sub;
    
    const enrollment = await storage.getEnrollment(userId, courseId);
    if (!enrollment) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }
    
    const quizzes = await storage.getCourseQuizzes(courseId);
    res.json(quizzes);
  }));

  app.post('/api/quizzes/:quizId/submit', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quizId } = req.params;
    const { answers, timeSpent } = req.body;
    const userId = req.user.claims.sub;
    
    const result = await storage.submitQuizAttempt({
      quizId,
      userId,
      timeSpent,
      score: '0',
      totalPoints: 0,
      passed: false
    });
    
    res.json(result);
  }));

  app.get('/api/quizzes/:quizId/attempts', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quizId } = req.params;
    const userId = req.user.claims.sub;
    
    const attempts = await storage.getQuizAttempts(userId, quizId);
    res.json(attempts);
  }));

  // Instructor application routes
  app.post('/api/instructor-applications', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const applicationData = insertInstructorApplicationSchema.parse({ ...req.body, userId });
    
    const existingApplication = await storage.getInstructorApplicationByUserId(userId);
    if (existingApplication && (existingApplication.status === 'pending' || existingApplication.status === 'approved')) {
      return res.status(400).json({ 
        message: `You already have a ${existingApplication.status} instructor application.` 
      });
    }

    const application = await storage.createInstructorApplication(applicationData);
    res.status(201).json(application);
  }));

  app.get('/api/instructor-applications/my-application', isAuthenticated, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const application = await storage.getInstructorApplicationByUserId(userId);
    
    if (!application) {
      return res.status(404).json({ message: "No application found" });
    }
    
    res.json(application);
  }));

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  }));

  app.get('/api/admin/instructor-applications', isAuthenticated, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const { status, page = '1', limit = '20' } = req.query;
    const applications = await storage.getInstructorApplications({
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    res.json(applications);
  }));

  app.put('/api/admin/instructor-applications/:id', isAuthenticated, requireRole('admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, comments } = req.body;
    const reviewerId = req.user.claims.sub;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const updatedApplication = await storage.updateInstructorApplication(id, {
      status,
      reviewComments: comments,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    });

    if (status === 'approved' && updatedApplication && updatedApplication.userId) {
      await storage.updateUserRole(updatedApplication.userId, 'instructor');
    }

    res.json(updatedApplication);
  }));

  app.get('/api/admin/users', isAuthenticated, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '20', search, role } = req.query;
    const users = await storage.getUsers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      role: role as string
    });
    res.json(users);
  }));

  app.get('/api/admin/courses', isAuthenticated, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '20', status, instructor } = req.query;
    const courses = await storage.getCoursesForAdmin({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
      instructor: instructor as string
    });
    res.json(courses);
  }));

  app.put('/api/admin/users/:id/role', isAuthenticated, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['student', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await storage.updateUserRole(id, role);
    res.json(user);
  }));

  // Error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}