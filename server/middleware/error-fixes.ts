/**
 * Common 400 Error Fixes
 * 
 * This file provides utilities to fix the most common 400 errors
 * found in the codebase analysis.
 */

import type { Request, Response } from "express";

/**
 * Enhanced 400 error response with better formatting
 */
export const send400Error = (res: Response, message: string, details?: any) => {
  return res.status(400).json({
    error: "Bad Request",
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });
};

/**
 * Validate required fields with detailed error messages
 */
export const validateRequiredFields = (req: Request, fields: string[]): { isValid: boolean; error?: any } => {
  const missing = fields.filter(field => !req.body?.[field]);
  
  if (missing.length > 0) {
    return {
      isValid: false,
      error: {
        message: "Missing required fields",
        missing,
        required: fields
      }
    };
  }
  
  return { isValid: true };
};

/**
 * Validate email format with better error handling
 */
export const validateEmailFormat = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Invalid email address format" };
  }
  
  return { isValid: true };
};

/**
 * Validate file upload with comprehensive checks
 */
export const validateFileUpload = (req: Request, allowedTypes?: string[]): { isValid: boolean; error?: any } => {
  if (!req.file && !req.files) {
    return {
      isValid: false,
      error: {
        message: "No file provided",
        expected: "multipart/form-data with file"
      }
    };
  }
  
  const file = req.file || (req.files as any)?.[0];
  if (!file) {
    return {
      isValid: false,
      error: {
        message: "No valid file found in upload"
      }
    };
  }
  
  if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: {
        message: "Invalid file type",
        provided: file.mimetype,
        allowed: allowedTypes
      }
    };
  }
  
  return { isValid: true };
};

/**
 * Common validation patterns for specific use cases
 */
export const validators = {
  // Course enrollment validation
  enrollment: (req: Request) => {
    const { courseId, enrollmentLevel } = req.body;
    
    if (!courseId) {
      return { isValid: false, error: "Course ID is required" };
    }
    
    if (!enrollmentLevel) {
      return { isValid: false, error: "Enrollment level is required" };
    }
    
    const validLevels = ["ASSOCIATE", "MEMBER", "FELLOW"];
    if (!validLevels.includes(enrollmentLevel)) {
      return { 
        isValid: false, 
        error: "Invalid enrollment level",
        details: { validLevels, provided: enrollmentLevel }
      };
    }
    
    return { isValid: true };
  },

  // Role validation
  role: (role: string) => {
    const validRoles = ["student", "instructor", "admin"];
    if (!validRoles.includes(role)) {
      return {
        isValid: false,
        error: "Invalid role",
        details: { validRoles, provided: role }
      };
    }
    return { isValid: true };
  },

  // Video URL validation
  videoUrl: (url: string) => {
    if (!url) {
      return { isValid: false, error: "Video URL is required" };
    }
    
    try {
      new URL(url);
      return { isValid: true };
    } catch {
      return { isValid: false, error: "Invalid URL format" };
    }
  },

  // Quiz responses validation
  quizResponses: (responses: any[]) => {
    if (!Array.isArray(responses)) {
      return { isValid: false, error: "Responses must be an array" };
    }
    
    if (responses.length === 0) {
      return { isValid: false, error: "At least one response is required" };
    }
    
    return { isValid: true };
  }
};

/**
 * Middleware factory for common validations
 */
export const createValidationMiddleware = (validator: (req: Request) => { isValid: boolean; error?: any }) => {
  return (req: Request, res: Response, next: any) => {
    const result = validator(req);
    
    if (!result.isValid) {
      return send400Error(res, result.error.message || "Validation failed", result.error);
    }
    
    next();
  };
};
