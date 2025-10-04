/**
 * Role-Based Access Control Middleware
 * 
 * Implements authorization middleware for protecting routes based on user roles.
 * 
 * Roles Hierarchy:
 * - Student: Basic access to enrolled courses
 * - Instructor: Can create and manage courses
 * - Admin: Full platform access (overrides all other roles)
 * 
 * Usage:
 * - Use requireRole() for exact role matching
 * - Use requireInstructor() to allow both instructors and admins
 * - Use requireAdmin() for admin-only access
 */

import type { RequestHandler } from 'express';
import type { User } from '@shared/schema';
import { storage } from '../storage';

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Requires user to have a specific role to access the route
 * Admin role bypasses all role checks
 * @param role - Required role: 'student', 'instructor', or 'admin'
 * @returns Express middleware function
 */
export function requireRole(role: 'student' | 'instructor' | 'admin'): RequestHandler {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const userRole = user.role || 'student';
      
      // Admin has access to everything
      if (userRole === 'admin') {
        return next();
      }
      
      // Check exact role match
      if (userRole === role) {
        return next();
      }

      return res.status(403).json({ 
        message: `Access denied. Required role: ${role}` 
      });
    } catch (error) {
      console.error('Role protection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export function requireInstructor(): RequestHandler {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const userRole = user.role || 'student';

      // Allow both instructors and admins
      if (userRole === 'instructor' || userRole === 'admin') {
        return next();
      }

      return res.status(403).json({ 
        message: 'Access denied. Instructor privileges required.' 
      });
    } catch (error) {
      console.error('Instructor protection error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export function requireAdmin(): RequestHandler {
  return requireRole('admin');
}

export function requireStudent(): RequestHandler {
  return requireRole('student');
}