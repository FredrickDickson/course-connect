/**
 * Supabase Authentication Middleware
 * ----------------------------------
 * Handles user authentication using Supabase JWTs.
 * 
 * Features:
 * - Verifies JWT tokens from Supabase Auth.
 * - Automatically fetches user info from Supabase.
 * - Supports both public routes and protected routes.
 * 
 * Environment Variables:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_ANON_KEY: Public anon key for client requests
 * - SUPABASE_SERVICE_ROLE_KEY: Private service key for server operations
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Express, Request, Response, NextFunction } from "express";

// Use VITE_ prefixed vars as fallback
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — auth middleware will be unavailable.');
}

// Initialize Supabase client using service key for secure operations
const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Middleware to verify Supabase JWT tokens.
 * Extracts the Bearer token from Authorization header and verifies it.
 */
export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request for downstream handlers
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Supabase auth check failed:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
}

/**
 * Sets up Supabase Auth middleware and endpoints on an Express app.
 * 
 * @param app Express instance
 */
export function setupAuth(app: Express) {
  // Example protected route (for testing)
  app.get("/api/protected", isAuthenticated, (req: Request, res: Response) => {
    res.json({
      message: "You are authenticated!",
      user: (req as any).user,
    });
  });

  // Example public route
  app.get("/api/public", (_req, res) => {
    res.json({ message: "This route is public." });
  });
}

export { supabase };