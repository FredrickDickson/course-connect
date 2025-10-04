import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import https from "https";
import crypto from "crypto";
import path from "path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireRole, requireInstructor } from "./middleware/roleProtection";
import { 
  securityMiddleware, 
  authLimiter,
  uploadLimiter,
  validateRequest,
  courseValidation,
  enrollmentValidation,
  reviewValidation,
  progressValidation,
  paginationValidation,
  searchValidation,
  uuidValidation,
  errorHandler,
  asyncHandler,
} from "./middleware/security";
import { body } from 'express-validator';
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

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply security middleware conditionally for development
  if (process.env.NODE_ENV === 'production') {
    app.use(securityMiddleware);
  }
  
  // Serve static files
  app.use('/uploads', express.static('uploads'));
  
  // Auth middleware
  await setupAuth(app);

  // Admin setup routes (for initial platform setup)
  app.post('/api/admin/setup', asyncHandler(async (req: any, res: any) => {
    const { email, setupKey } = req.body;
    
    // Simple setup key validation (in production, use environment variable)
    const validSetupKey = "CIMA_ADMIN_SETUP_2024";
    
    if (setupKey !== validSetupKey) {
      return res.status(401).json({ message: "Invalid setup key" });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found. Please register first." });
    }

    // Update user role to admin
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

  app.post('/api/admin/check-user', asyncHandler(async (req: any, res: any) => {
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

  // Debug endpoint to manually create user for admin setup (development only)
  app.post('/api/admin/create-user', asyncHandler(async (req: any, res: any) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: "Not available in production" });
    }
    
    const { email, firstName, lastName, setupKey } = req.body;
    
    // Validate setup key
    const validSetupKey = "CIMA_ADMIN_SETUP_2024";
    if (setupKey !== validSetupKey) {
      return res.status(401).json({ message: "Invalid setup key" });
    }
    
    try {
      // Create user for admin setup
      const newUser = await storage.upsertUser({
        id: `manual_${Date.now()}`, // temporary ID
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
      res.status(500).json({ message: "Failed to create user", error: error instanceof Error ? error.message : String(error) });
    }
  }));

  // Debug endpoint to check system status
  app.get('/api/debug/status', asyncHandler(async (req: any, res: any) => {
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

  // Enhanced Auth routes
  app.get('/api/auth/user', isAuthenticated, asyncHandler(async (req: any, res: any) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  }));

  // Profile management
  app.put('/api/auth/profile', isAuthenticated, asyncHandler(async (req: any, res: any) => {
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

  // Profile image upload
  app.post('/api/auth/profile/image', 
    isAuthenticated, 
    uploadLimiter,
    profileImageUpload.single('image'),
    handleUploadError,
    asyncHandler(async (req: any, res: any) => {
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

  // Categories
  app.get('/api/categories', asyncHandler(async (req: any, res: any) => {
    const categories = await storage.getCategories();
    res.json(categories);
  }));

  app.post('/api/categories', isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { name, description, slug } = req.body;
      if (!name || name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
      }
      if (!slug || slug.length < 2 || slug.length > 100) {
        return res.status(400).json({ message: "Slug must be between 2 and 100 characters" });
      }
      const category = await storage.createCategory({ name, description, slug });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Enhanced Courses with pagination and filtering
  app.get('/api/courses', async (req, res) => {
    try {
      const { category, search, level, featured, page = 1, limit = 20 } = req.query;
      const filters = {
        category: category as string,
        search: search as string,
        level: level as string,
        featured: featured === 'true',
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Cap at 100
      };
      const result = await storage.getCourses();
      res.json(result);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/featured', asyncHandler(async (req: any, res: any) => {
    const courses = await storage.getFeaturedCourses();
    res.json(courses);
  }));

  // File Upload Endpoints
  app.post('/api/upload/video', 
    isAuthenticated,
    requireInstructor(),
    uploadLimiter,
    videoUpload.single('video'),
    handleUploadError,
    asyncHandler(async (req: any, res: any) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }
      
      const videoUrl = getFileUrl(req, req.file.filename, 'video');
      res.json({ 
        message: 'Video uploaded successfully',
        videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        duration: null // Will be processed later
      });
    })
  );

  app.post('/api/upload/image', 
    isAuthenticated,
    uploadLimiter,
    imageUpload.single('image'),
    handleUploadError,
    asyncHandler(async (req: any, res: any) => {
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
    asyncHandler(async (req: any, res: any) => {
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
    asyncHandler(async (req: any, res: any) => {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }
      
      const uploadedFiles = req.files.map((file: any) => ({
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

  // Stats route must come before the :id route to avoid conflicts
  app.get('/api/courses/stats', async (req, res) => {
    try {
      const stats = {
        totalCourses: 6,
        totalStudents: 5000,
        averageRating: 4.8,
        totalHours: 120
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching course stats:", error);
      res.status(500).json({ message: "Failed to fetch course stats" });
    }
  });

  app.get('/api/courses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const course = await storage.getCourseById(id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Enrollments
  app.post('/api/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollmentData = insertEnrollmentSchema.parse({ ...req.body, userId });
      
      // Check if user is already enrolled
      const isEnrolled = await storage.isUserEnrolled(userId, enrollmentData.courseId || '');
      if (isEnrolled) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }

      const enrollment = await storage.enrollUser(enrollmentData);
      res.json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Failed to enroll in course" });
    }
  });

  app.get('/api/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getUserEnrollments(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/enrollments/check/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const isEnrolled = await storage.isUserEnrolled(userId, courseId);
      res.json({ isEnrolled });
    } catch (error) {
      console.error("Error checking enrollment:", error);
      res.status(500).json({ message: "Failed to check enrollment" });
    }
  });

  // Progress tracking
  app.post('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressData = insertProgressSchema.parse({ ...req.body, userId });
      const progress = await storage.updateProgress(progressData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.get('/api/progress/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const progress = await storage.getUserProgress(userId, courseId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get('/api/progress/overview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const overview = await storage.getUserOverallProgress(userId);
      res.json(overview);
    } catch (error) {
      console.error("Error fetching progress overview:", error);
      res.status(500).json({ message: "Failed to fetch progress overview" });
    }
  });

  // Enhanced student dashboard endpoints
  app.get('/api/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock data for now - would fetch from database
      const assignments = [
        {
          id: '1',
          title: 'Case Study Analysis: Cross-Border Dispute',
          course: { title: 'Cross-Border M&A Dispute Resolution' },
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          submissionStatus: 'pending'
        },
        {
          id: '2',
          title: 'Mediation Role-Play Submission',
          course: { title: 'Mediation Mastery Course' },
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          submissionStatus: 'submitted'
        }
      ];
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get('/api/quizzes/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock data for now - would fetch from database
      const quizzes = [
        {
          id: '1',
          title: 'Module 2 Knowledge Check',
          course: { title: 'International Arbitration Fundamentals' },
          questionCount: 15,
          timeLimit: 30
        },
        {
          id: '2',
          title: 'Final Assessment',
          course: { title: 'Cross-Border M&A Dispute Resolution' },
          questionCount: 25,
          timeLimit: 45
        }
      ];
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.get('/api/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock AI recommendations - would use ML algorithms
      const recommendations = [
        {
          id: '5',
          title: 'Advanced Arbitration Techniques',
          thumbnailUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
          avgRating: 4.8,
          matchScore: 92
        },
        {
          id: '6',
          title: 'International Commercial Law',
          thumbnailUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250',
          avgRating: 4.6,
          matchScore: 87
        }
      ];
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  app.get('/api/resources/downloadable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock downloadable resources
      const resources = [
        {
          id: '1',
          title: 'ADR Case Study Templates',
          type: 'pdf'
        },
        {
          id: '2',
          title: 'Arbitration Clause Library',
          type: 'docx'
        },
        {
          id: '3',
          title: 'Mediation Checklists',
          type: 'pdf'
        },
        {
          id: '4',
          title: 'International Arbitration Rules Reference',
          type: 'pdf'
        }
      ];
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Reviews
  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviewData = insertReviewSchema.parse({ ...req.body, userId });
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get('/api/reviews/:courseId', async (req, res) => {
    try {
      const { courseId } = req.params;
      const reviews = await storage.getCourseReviews(courseId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Discussions
  app.post('/api/discussions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const discussionData = insertDiscussionSchema.parse({ ...req.body, userId });
      const discussion = await storage.createDiscussion(discussionData);
      res.json(discussion);
    } catch (error) {
      console.error("Error creating discussion:", error);
      res.status(500).json({ message: "Failed to create discussion" });
    }
  });

  app.get('/api/discussions/:courseId', async (req, res) => {
    try {
      const { courseId } = req.params;
      const discussions = await storage.getCourseDiscussions(courseId);
      res.json(discussions);
    } catch (error) {
      console.error("Error fetching discussions:", error);
      res.status(500).json({ message: "Failed to fetch discussions" });
    }
  });

  app.post('/api/replies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const replyData = insertReplySchema.parse({ ...req.body, userId });
      const reply = await storage.createReply(replyData);
      res.json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  app.get('/api/replies/:discussionId', async (req, res) => {
    try {
      const { discussionId } = req.params;
      const replies = await storage.getDiscussionReplies(discussionId);
      res.json(replies);
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({ message: "Failed to fetch replies" });
    }
  });

  // Certifications
  app.get('/api/certifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const certifications = await storage.getUserCertifications(userId);
      res.json(certifications);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      res.status(500).json({ message: "Failed to fetch certifications" });
    }
  });

  // Payment integration with Paystack
  app.post("/api/initialize-payment", isAuthenticated, async (req: any, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(503).json({ message: "Payment system is not configured. Please contact the administrator." });
      }

      const { courseId } = req.body;
      const userId = req.user.claims.sub;

      // Get course details
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if already enrolled
      const isEnrolled = await storage.isUserEnrolled(userId, courseId);
      if (isEnrolled) {
        return res.status(400).json({ message: "Already enrolled in this course" });
      }

      // Get user details
      const user = await storage.getUser(userId);
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email required for payment" });
      }

      const amount = Math.round(parseFloat(course.price) * 100); // Convert to kobo/cents
      const reference = `course_${courseId}_${userId}_${Date.now()}`;

      // Initialize Paystack transaction
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

      // Create order record
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
    } catch (error: any) {
      console.error("Error initializing payment:", error);
      res.status(500).json({ message: "Error initializing payment: " + error.message });
    }
  });

  // Webhook to handle successful payments
  app.post('/api/paystack-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ message: "Payment system is not configured" });
    }

    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(req.body).digest('hex');
    const signature = req.headers['x-paystack-signature'] as string;

    if (hash !== signature) {
      return res.status(400).send('Invalid signature');
    }

    try {
      const event = JSON.parse(req.body.toString());

      if (event.event === 'charge.success') {
        const { reference, metadata } = event.data;
        const { courseId, userId } = metadata;

        // Update order status
        await storage.updateOrderByReference(reference, 'completed');

        // Enroll user in course
        await storage.enrollUser({ userId, courseId });
      }

      res.json({received: true});
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Verify payment status
  app.post('/api/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(503).json({ message: "Payment system is not configured. Please contact the administrator." });
      }

      const { reference } = req.body;
      const userId = req.user.claims.sub;

      // Verify payment with Paystack
      const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      });

      const result = await response.json();

      if (result.status && result.data.status === 'success') {
        const { metadata } = result.data;
        const { courseId } = metadata;

        // Update order status
        await storage.updateOrderByReference(reference, 'completed');

        // Enroll user in course
        await storage.enrollUser({ userId, courseId });

        res.json({ success: true, data: result.data });
      } else {
        await storage.updateOrderByReference(reference, 'failed');
        res.json({ success: false, message: 'Payment verification failed' });
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Error verifying payment: " + error.message });
    }
  });

  // Orders
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Instructor routes
  app.get('/api/instructor/courses', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const courses = await storage.getInstructorCourses(instructorId);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching instructor courses:", error);
      res.status(500).json({ message: "Failed to fetch instructor courses" });
    }
  });

  app.get('/api/instructor/stats', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const stats = await storage.getInstructorStats(instructorId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching instructor stats:", error);
      res.status(500).json({ message: "Failed to fetch instructor stats" });
    }
  });

  // Enhanced instructor dashboard endpoints
  app.get('/api/instructor/revenue', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock revenue data - would calculate from real orders/enrollments
      const revenueData = [
        { month: 'Jan', amount: 1890 },
        { month: 'Feb', amount: 2100 },
        { month: 'Mar', amount: 2450 }
      ];
      res.json(revenueData);
    } catch (error) {
      console.error("Error fetching instructor revenue:", error);
      res.status(500).json({ message: "Failed to fetch instructor revenue" });
    }
  });

  app.get('/api/instructor/submissions/pending', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock pending submissions - would fetch from database
      const submissions = [
        {
          id: '1',
          assignment: { title: 'Case Study Analysis' },
          student: { firstName: 'Sarah', lastName: 'Johnson' },
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          assignment: { title: 'Arbitration Role-Play' },
          student: { firstName: 'Michael', lastName: 'Chen' },
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching pending submissions:", error);
      res.status(500).json({ message: "Failed to fetch pending submissions" });
    }
  });

  app.get('/api/instructor/questions', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock student questions - would fetch from database
      const questions = [
        {
          id: '1',
          content: 'Can you clarify the difference between arbitration and mediation in cross-border disputes?',
          student: { firstName: 'Emma', lastName: 'Davis' },
          course: { title: 'Cross-Border M&A Dispute Resolution' },
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          content: 'What are the key considerations when choosing the seat of arbitration?',
          student: { firstName: 'Alex', lastName: 'Rodriguez' },
          course: { title: 'International Arbitration Fundamentals' },
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        }
      ];
      res.json(questions);
    } catch (error) {
      console.error("Error fetching student questions:", error);
      res.status(500).json({ message: "Failed to fetch student questions" });
    }
  });

  app.get('/api/instructor/analytics', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Mock course analytics - would calculate from real data
      const analytics = [
        {
          id: '1',
          title: 'Cross-Border M&A Dispute Resolution',
          enrollmentCount: 45,
          avgRating: 4.8,
          revenue: 890,
          completionRate: 82
        },
        {
          id: '2',
          title: 'International Arbitration Fundamentals',
          enrollmentCount: 38,
          avgRating: 4.6,
          revenue: 756,
          completionRate: 76
        },
        {
          id: '3',
          title: 'Mediation Mastery',
          enrollmentCount: 52,
          avgRating: 4.7,
          revenue: 1040,
          completionRate: 89
        }
      ];
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching course analytics:", error);
      res.status(500).json({ message: "Failed to fetch course analytics" });
    }
  });

  app.post('/api/instructor/courses', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const courseData = insertCourseSchema.parse({ ...req.body, instructorId });
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.put('/api/instructor/courses/:id', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify course belongs to instructor
      const course = await storage.getCourseById(id);
      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertCourseSchema.partial().parse(req.body);
      const updatedCourse = await storage.updateCourse(id, updates);
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.delete('/api/instructor/courses/:id', isAuthenticated, requireInstructor(), async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify course belongs to instructor
      const course = await storage.getCourseById(id);
      if (!course || course.instructorId !== instructorId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCourse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Admin routes
  app.put('/api/admin/users/:id/role', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['student', 'instructor', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Quiz routes
  app.get('/api/courses/:courseId/quizzes', isAuthenticated, async (req: any, res: any) => {
    try {
      const { courseId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this course
      const enrollment = await storage.getEnrollment(userId, courseId);
      if (!enrollment) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }
      
      const quizzes = await storage.getCourseQuizzes(courseId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching course quizzes:", error);
      res.status(500).json({ message: "Failed to fetch course quizzes" });
    }
  });

  app.post('/api/quizzes/:quizId/submit', isAuthenticated, async (req: any, res: any) => {
    try {
      const { quizId } = req.params;
      const { answers, timeSpent } = req.body;
      const userId = req.user.claims.sub;
      
      const result = await storage.submitQuizAttempt({
        quizId,
        userId,
        timeSpent,
        score: '0', // Will be calculated
        totalPoints: 0,
        passed: false
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  app.get('/api/quizzes/:quizId/attempts', isAuthenticated, async (req: any, res: any) => {
    try {
      const { quizId } = req.params;
      const userId = req.user.claims.sub;
      
      const attempts = await storage.getQuizAttempts(userId, quizId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });

  // Instructor application routes
  app.post('/api/instructor-applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applicationData = insertInstructorApplicationSchema.parse({ ...req.body, userId });
      
      // Check if user already has a pending/approved application
      const existingApplication = await storage.getInstructorApplicationByUserId(userId);
      if (existingApplication && (existingApplication.status === 'pending' || existingApplication.status === 'approved')) {
        return res.status(400).json({ 
          message: `You already have a ${existingApplication.status} instructor application.` 
        });
      }

      const application = await storage.createInstructorApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating instructor application:", error);
      res.status(500).json({ message: "Failed to create instructor application" });
    }
  });

  app.get('/api/instructor-applications/my-application', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const application = await storage.getInstructorApplicationByUserId(userId);
      
      if (!application) {
        return res.status(404).json({ message: "No application found" });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error fetching instructor application:", error);
      res.status(500).json({ message: "Failed to fetch instructor application" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/instructor-applications', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const applications = await storage.getInstructorApplications({
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      res.json(applications);
    } catch (error) {
      console.error("Error fetching instructor applications:", error);
      res.status(500).json({ message: "Failed to fetch instructor applications" });
    }
  });

  app.put('/api/admin/instructor-applications/:id', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
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

      // If approved, update user role to instructor
      if (status === 'approved' && updatedApplication && updatedApplication.userId) {
        await storage.updateUserRole(updatedApplication.userId, 'instructor');
      }

      res.json(updatedApplication);
    } catch (error) {
      console.error("Error updating instructor application:", error);
      res.status(500).json({ message: "Failed to update instructor application" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { page = 1, limit = 20, search, role } = req.query;
      const users = await storage.getUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        role: role as string
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/courses', isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { page = 1, limit = 20, status, instructor } = req.query;
      const courses = await storage.getCoursesForAdmin({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        instructor: instructor as string
      });
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses for admin:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });


  // Error handling middleware (must be last)
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
