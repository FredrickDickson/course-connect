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

