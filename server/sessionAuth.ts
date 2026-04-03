/**
 * Session-Based Authentication with Supabase JWT Support
 *
 * Primary auth path: Supabase JWT (Bearer token) — verified via Service Role Key
 * Fallback auth path: Express session cookie — used for /admin-setup bootstrap only
 *
 * Auto-provisions Supabase users into the local `users` table on first API call
 * so that role-protection middleware can correctly read their role.
 */

import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

// Extend Express Request to include session user
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export function setupSessionAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET environment variable is required for secure session management. " +
      "Please set a strong, random secret in your environment variables."
    );
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
        sameSite: "lax",
      },
    })
  );
}

// ---------------------------------------------------------------------------
// Supabase client — uses Service Role Key for server-side JWT verification.
// IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed to the browser.
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";

// Prefer the service role key; fall back to anon key so dev still works if
// the service role key hasn't been added to .env yet.
const supabaseServerKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[AUTH] SUPABASE_SERVICE_ROLE_KEY is not set. " +
    "Falling back to anon key — add the service role key to .env for production."
  );
}

const supabase = createClient(supabaseUrl, supabaseServerKey, {
  auth: {
    // Disable automatic token refresh on the server side
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// isAuthenticated middleware
//
// 1. Tries to verify a Supabase Bearer JWT from the Authorization header.
//    On success: auto-provisions user in local DB if needed, attaches
//    req.user = { claims: { sub: <supabase_user_id> } }
//
// 2. Falls back to Express session cookie (used by /admin-setup flow).
// ---------------------------------------------------------------------------
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // ── Path 1: Supabase JWT ─────────────────────────────────────────────────
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res
          .status(401)
          .json({ message: "Invalid or expired token" });
      }

      // Auto-provision: ensure the Supabase user exists in the local users table.
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
            firstName,
            lastName,
            profileImageUrl: user.user_metadata?.avatar_url || null,
            role: "student", // default role; admin can upgrade via /admin
          });
          console.log(`[AUTH] Auto-provisioned new user: ${user.email}`);
        } catch (provisionErr) {
          console.error("[AUTH] Failed to auto-provision user:", provisionErr);
          // Don't block the request — user may already exist (race condition)
        }
      }

      // Attach user to request in the format expected by all routes
      (req as any).user = {
        claims: { sub: user.id },
        email: user.email,
        role: localUser?.role || "student",
      };

      return next();
    } catch (err) {
      console.error("[AUTH] Supabase JWT verification error:", err);
      return res.status(401).json({ message: "Authentication error" });
    }
  }

  // ── Path 2: Express session fallback (admin-setup / dev only) ───────────
  if (!req.session.userId) {
    return res
      .status(401)
      .json({ message: "Unauthorized — please sign in" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.userId = undefined;
    return res
      .status(401)
      .json({ message: "Session expired — please sign in again" });
  }

  (req as any).user = { claims: { sub: user.id }, role: user.role };
  next();
};

// ---------------------------------------------------------------------------
// Password hashing utilities (used by /admin-setup)
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
