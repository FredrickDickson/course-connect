/**
 * Validation Middleware
 * 
 * Centralized validation utilities to prevent 400 errors
 * and provide consistent error responses.
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Generic validation middleware using Zod schemas
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (req.body && Object.keys(req.body).length > 0) {
        const result = schema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            error: "Validation failed",
            details: result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          });
        }
        req.body = result.data;
      }
      next();
    } catch (error) {
      return res.status(400).json({
        error: "Invalid request format",
        message: "Request body could not be processed"
      });
    }
  };
};

/**
 * Validate required fields in request body
 */
export const requireFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(field => !req.body?.[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        required: fields,
        missing: missing
      });
    }
    
    next();
  };
};

/**
 * Validate file upload presence
 */
export const requireFile = (fieldName: string = 'file') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return res.status(400).json({
        error: "File required",
        message: `No ${fieldName} file provided`
      });
    }
    next();
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Course enrollment
  enrollment: z.object({
    courseId: z.string().min(1, "Course ID is required"),
    enrollmentLevel: z.enum(["basic", "premium", "vip"], {
      errorMap: () => ({ message: "Invalid enrollment level" })
    })
  }),

  // User role update
  roleUpdate: z.object({
    role: z.enum(["student", "instructor", "admin"], {
      errorMap: () => ({ message: "Invalid role" })
    })
  }),

  // Contact form
  contact: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required")
  }),

  // Video URL validation
  videoUrl: z.object({
    url: z.string().url("Invalid URL format").min(1, "URL is required")
  }),

  // Quiz responses
  quizResponses: z.object({
    responses: z.array(z.any()).min(1, "At least one response is required"),
    timeSpent: z.number().optional()
  }),

  // Certificate URL
  certificateUrl: z.object({
    certificateUrl: z.string().url("Invalid URL format").min(1, "Certificate URL is required")
  })
};

/**
 * Enhanced error response helper
 */
export const createErrorResponse = (res: Response, status: number, error: string, details?: any) => {
  return res.status(status).json({
    error,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });
};
