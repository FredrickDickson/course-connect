/**
 * Admin Routes - /api/admin/* endpoints
 * All routes require admin role middleware (requireRole("admin")).
 * Uses Supabase client (service role) for all database operations.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "../storage";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireRole } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

// Apply admin middleware to all routes
router.use(requireSupabaseAuth, requireRole("admin"));

// Get admin stats
router.get(
  "/stats",
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  }),
);

// Get instructor applications
router.get(
  "/instructor-applications",
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

// Update instructor application (approve/reject)
router.put(
  "/instructor-applications/:id",
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

// Get users (paginated)
router.get(
  "/users",
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

// Update user role
router.put(
  "/users/:id/role",
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

// Create new user (admin only)
router.post(
  "/create-user",
  asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role || "student",
        },
      });

    if (authError) {
      return res.status(500).json({ message: authError.message });
    }

    // Create user record in database
    const user = await storage.upsertUser({
      id: authData.user.id,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      role: role || "student",
    });

    res.status(201).json(user);
  }),
);

// Get courses (paginated for admin)
router.get(
  "/courses",
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

// SECURITY: bootstrap endpoint — disable in production after first admin is created
router.post(
  "/check-user",
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
            firstName: user.first_name,
            lastName: user.last_name,
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

// Debug status (development only)
router.get(
  "/debug/status",
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

export default router;
