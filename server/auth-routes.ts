/**
 * Authentication Routes - Session-Based with Email/Password
 */

import type { Express, Request, Response } from 'express';
import { storage } from './storage';
import { authLimiter, asyncHandler } from './middleware/security';
import { hashPassword, verifyPassword } from './sessionAuth';

export function registerAuthRoutes(app: Express) {
  
  // Register
  app.post('/api/auth/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return res.status(400).json({ message: 'Names must be at least 2 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Password strength
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({ 
        message: 'Password must contain uppercase, lowercase, number, and special character' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check existing user
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await storage.upsertUser({
      email: email.toLowerCase().trim(),
      password: passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'student',
    });

    // Create session
    req.session.userId = user.id;

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    });
  }));

  // Login
  app.post('/api/auth/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await storage.getUserByEmail(email.toLowerCase().trim());
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create session
    req.session.userId = user.id;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    });
  }));

  // Get current user
  app.get('/api/auth/user', asyncHandler(async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      bio: user.bio,
      profileImageUrl: user.profileImageUrl,
    });
  }));

  // Logout
  app.post('/api/auth/logout', asyncHandler(async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  }));
}
