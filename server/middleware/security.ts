/**
 * Security Middleware
 *
 * Provides comprehensive security controls for the application including:
 * - Rate limiting to prevent abuse
 * - HTTP security headers via Helmet
 * - CORS configuration
 * - Request validation
 * - Input sanitization
 *
 * All middleware is applied selectively based on environment and route patterns.
 */

import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { body, query, param, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";

// Startup check: FRONTEND_URL must be set in production
if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL must be set in production");
}

// ============================================================================
// RATE LIMITING
// Prevents abuse by limiting requests per IP address
// ============================================================================

/**
 * Auth rate limiter - Strict limits for authentication endpoints
 * Prevents brute force attacks on login/signup
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 auth attempts per window
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General rate limiter - Applied to most API endpoints
 * Relaxed in development, strict in production
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Generous limit for normal usage
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for static assets and development environment
    return (
      req.url.startsWith("/uploads") ||
      req.url.startsWith("/assets") ||
      req.url.includes("vite") ||
      process.env.NODE_ENV === "development"
    );
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 upload requests per hour
  message: {
    error: "Upload limit exceeded, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        mediaSrc: ["'self'", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          "ws://localhost:*",
          "http://localhost:*",
        ],
      },
    },
  }),
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : ["http://localhost:3000", "http://localhost:5000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  }),
  compression(),
  generalLimiter,
];

// Validation middleware
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array(),
    });
  }
  next();
};

// Common validation rules
export const courseValidation = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description must not exceed 5000 characters"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a valid positive number"),
  body("level")
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage("Level must be beginner, intermediate, or advanced"),
  body("categoryId")
    .optional()
    .isUUID()
    .withMessage("Category ID must be a valid UUID"),
];

export const enrollmentValidation = [
  body("courseId").isUUID().withMessage("Course ID must be a valid UUID"),
];

export const reviewValidation = [
  body("courseId").isUUID().withMessage("Course ID must be a valid UUID"),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must not exceed 1000 characters"),
];

export const progressValidation = [
  body("lessonId").isUUID().withMessage("Lesson ID must be a valid UUID"),
  body("watchTime")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Watch time must be a non-negative integer"),
  body("completed")
    .optional()
    .isBoolean()
    .withMessage("Completed must be a boolean value"),
];

export const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const searchValidation = [
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query must not exceed 100 characters"),
  query("category")
    .optional()
    .isAlphanumeric()
    .withMessage("Category must be alphanumeric"),
  query("level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced"])
    .withMessage("Level must be beginner, intermediate, or advanced"),
];

export const uuidValidation = [
  param("id").isUUID().withMessage("ID must be a valid UUID"),
];

// Error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("Error:", err);

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      message: err.message,
      details: err.details || [],
    });
  }

  // Database errors
  if (err.code === "23505") {
    // Unique constraint violation
    return res.status(409).json({
      error: "Conflict",
      message: "Resource already exists",
    });
  }

  if (err.code === "23503") {
    // Foreign key constraint violation
    return res.status(400).json({
      error: "Bad Request",
      message: "Referenced resource does not exist",
    });
  }

  if (err.code === "22P02") {
    // Invalid UUID
    return res.status(400).json({
      error: "Bad Request",
      message: "Invalid ID format",
    });
  }

  // Authentication errors
  if (err.name === "UnauthorizedError" || err.status === 401) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Authorization errors
  if (err.status === 403) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Insufficient permissions",
    });
  }

  // Not found errors
  if (err.status === 404) {
    return res.status(404).json({
      error: "Not Found",
      message: "Resource not found",
    });
  }

  // Default server error
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
