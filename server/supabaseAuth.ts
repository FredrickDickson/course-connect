/**
 * Supabase Authentication Middleware
 * ----------------------------------
 * Handles user authentication using Supabase JWTs and auto-provisions
 * user records in the local database.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Use VITE_ prefixed vars as fallback for consistency with frontend
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[AUTH] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — auth middleware will be unavailable.');
}

// Initialize Supabase client with service role for administrative access (getUser)
const supabase: SupabaseClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
) : null as any;

/**
 * Middleware to verify Supabase JWT tokens.
 * Extracts the Bearer token from Authorization header and verifies it.
 * Also ensures the user exists in the local platform database (auto-provisioning).
 */
export async function requireSupabaseAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Unauthorized — Invalid token" });
    }

    // Auto-provision: ensure the Supabase user exists in the local platform 'users' table.
    // This syncs the user on their very first API call after sign-up.
    let localUser = await storage.getUser(user.id);
    
    if (!localUser) {
      const fullName: string = user.user_metadata?.full_name || "";
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || user.email?.split("@")[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      try {
        localUser = await storage.upsertUser({
          id: user.id,
          email: user.email!,
          first_name: firstName,
          last_name: lastName,
          profile_image_url: user.user_metadata?.avatar_url || null,
          role: "student", // Default role
          created_at: new Date(),
        });
        console.log(`[AUTH] Auto-provisioned new user record: ${user.email} (${user.id})`);
      } catch (provisionErr) {
        console.error("[AUTH] Failed to auto-provision user:", provisionErr);
        // We attempt to fetch one more time in case of race condition
        localUser = await storage.getUser(user.id);
        if (!localUser) {
           return res.status(500).json({ message: "Failed to synchronize user data" });
        }
      }
    }

    // Attach user information to the request for downstream handlers and RBAC middleware
    (req as any).user = {
      ...user,
      claims: { sub: user.id }, // Maintain compatibility with existing code
      role: localUser.role || 'student'
    };
    
    next();
  } catch (error) {
    console.error("[AUTH] Supabase authentication failed:", error);
    res.status(401).json({ message: "Unauthorized — Authentication failed" });
  }
}

export { supabase };