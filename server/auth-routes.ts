/**
 * Authentication Routes
 * 
 * Complete authentication flow with Supabase Auth integration:
 * - User registration with email/password
 * - User login with JWT
 * - Session management
 * - Password reset
 * - Profile updates
 */

import type { Express, Request, Response } from 'express';
import { supabase } from './supabaseAuth';
import { storage } from './storage';
import { authLimiter, asyncHandler } from './middleware/security';

interface AuthRequest extends Request {
  user: {
    claims: {
      sub: string;
    }
  }
}

export function registerAuthRoutes(app: Express) {
  
  // ============================================================================
  // REGISTRATION ROUTE
  // ============================================================================
  app.post('/api/auth/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return res.status(400).json({ 
        message: 'First name and last name must be at least 2 characters' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters' 
      });
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return res.status(400).json({ 
        message: 'Password must contain uppercase, lowercase, number, and special character' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Passwords do not match' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    try {
      // Check if user already exists in database
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ 
          message: 'Email already registered' 
        });
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: password,
        email_confirm: true, // Auto-confirm email for now (optional)
        user_metadata: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }
      });

      if (authError || !authData.user) {
        console.error('Supabase auth error:', authError);
        
        // Check for specific Supabase errors
        if (authError?.message?.includes('already registered')) {
          return res.status(409).json({ 
            message: 'Email already registered' 
          });
        }
        
        return res.status(400).json({ 
          message: authError?.message || 'Registration failed' 
        });
      }

      // Create user record in database
      const user = await storage.upsertUser({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'student',
      });

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

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // LOGIN ROUTE
  // ============================================================================
  app.post('/api/auth/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (error || !data.session) {
        console.error('Login error:', error);
        return res.status(401).json({ 
          message: 'Invalid email or password' 
        });
      }

      // Get user from database
      const user = await storage.getUser(data.user.id);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      // Set session cookie (optional - depends on your frontend auth strategy)
      res.setHeader('Authorization', `Bearer ${data.session.access_token}`);

      res.json({
        message: 'Login successful',
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in,
          expiresAt: data.session.expires_at,
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // REFRESH TOKEN ROUTE
  // ============================================================================
  app.post('/api/auth/refresh', asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        message: 'Refresh token is required' 
      });
    }

    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return res.status(401).json({ 
          message: 'Failed to refresh session' 
        });
      }

      res.json({
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in,
          expiresAt: data.session.expires_at,
        }
      });

    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({
        message: 'Token refresh failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // LOGOUT ROUTE
  // ============================================================================
  app.post('/api/auth/logout', asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
      if (refreshToken) {
        await supabase.auth.admin.deleteSession(refreshToken);
      }

      res.json({ 
        message: 'Logout successful' 
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // GET CURRENT USER
  // ============================================================================
  app.get('/api/auth/me', asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ 
          message: 'Not authenticated' 
        });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      res.json(user);

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        message: 'Failed to get user',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // PASSWORD RESET REQUEST
  // ============================================================================
  app.post('/api/auth/forgot-password', authLimiter, asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${req.protocol}://${req.get('host')}/reset-password`,
        }
      );

      if (error) {
        console.error('Password reset error:', error);
      }

      // Always return success for security (don't reveal if email exists)
      res.json({
        message: 'If an account exists with this email, you will receive a password reset link'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        message: 'Password reset request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // RESET PASSWORD
  // ============================================================================
  app.post('/api/auth/reset-password', asyncHandler(async (req: Request, res: Response) => {
    const { password, confirmPassword } = req.body;
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(400).json({ 
        message: 'Reset token is required' 
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Password fields are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Passwords do not match' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters' 
      });
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      }, {
        jwt: token,
      });

      if (error) {
        return res.status(400).json({ 
          message: 'Password reset failed',
          error: error.message 
        });
      }

      res.json({ 
        message: 'Password reset successful' 
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        message: 'Password reset failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // CHANGE PASSWORD (for authenticated users)
  // ============================================================================
  app.post('/api/auth/change-password', asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: 'All password fields are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Passwords do not match' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters' 
      });
    }

    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !user.email) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return res.status(401).json({ 
          message: 'Current password is incorrect' 
        });
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return res.status(400).json({ 
          message: 'Failed to update password',
          error: updateError.message 
        });
      }

      res.json({ 
        message: 'Password changed successfully' 
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        message: 'Password change failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // VERIFY EMAIL (after registration)
  // ============================================================================
  app.post('/api/auth/verify-email', asyncHandler(async (req: Request, res: Response) => {
    const { token, type } = req.body;

    if (!token || !type) {
      return res.status(400).json({ 
        message: 'Token and type are required' 
      });
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'email' | 'sms' | 'recovery',
      });

      if (error) {
        return res.status(400).json({ 
          message: 'Email verification failed',
          error: error.message 
        });
      }

      res.json({ 
        message: 'Email verified successfully' 
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        message: 'Email verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // ============================================================================
  // GOOGLE OAUTH (optional)
  // ============================================================================
  app.post('/api/auth/oauth/google', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${req.protocol}://${req.get('host')}/auth/callback`,
        }
      });

      if (error) {
        return res.status(400).json({ 
          message: 'OAuth failed',
          error: error.message 
        });
      }

      res.json({
        url: data.url,
      });

    } catch (error) {
      console.error('OAuth error:', error);
      res.status(500).json({
        message: 'OAuth failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

}
