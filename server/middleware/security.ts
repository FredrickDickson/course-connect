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
import { validationResult } from "express-validator";
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

/**
 * Eligibility check rate limiter - Prevents bot scraping of professional directory
 * Limits eligibility checks to prevent abuse
 */
export const eligibilityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 eligibility checks per window
  message: {
    error: "Too many eligibility checks, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Payment rate limiter - Applied to order creation / payment verification
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    error: "Too many payment requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Contact form rate limiter
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: "Too many contact form submissions, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Quiz submission rate limiter - Prevents rapid-fire brute-forcing of quiz answers
 */
export const quizSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    error: "Too many quiz submissions, please try again later.",
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
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.paystack.co", "https://va.vercel-scripts.com"],
        mediaSrc: ["'self'", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          "ws://localhost:*",
          "http://localhost:*",
          "https://api.paystack.co",
          "https://emvibxbcrvritkwkguya.supabase.co",
        ],
        workerSrc: ["'self'", "blob:"],
      },
    },
  }),
  cors({
    // Auth is bearer-token only (no server-side cookie session — see
    // server/supabaseAuth.ts), so `credentials: true` and a `Cookie`
    // allowance aren't needed here; the client's `credentials: "include"`
    // fetch option (queryClient.ts, ResourceUploader.tsx) is inert without
    // a matching server-side cookie policy.
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL
        : ["http://localhost:3000", "http://localhost:5000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
