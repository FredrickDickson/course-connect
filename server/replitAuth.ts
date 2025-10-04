/**
 * Replit Authentication Integration
 * 
 * Configures OAuth2/OpenID Connect authentication using Replit's identity provider.
 * Handles user sessions, token management, and automatic user creation.
 * 
 * Key Features:
 * - OpenID Connect authentication flow
 * - Session management with PostgreSQL or memory store
 * - Automatic token refresh
 * - User profile synchronization
 * 
 * Environment Variables:
 * - REPLIT_DOMAINS: Required - Replit domain for OAuth
 * - SESSION_SECRET: Required - Secret key for session encryption
 * - DATABASE_URL: Optional - PostgreSQL connection for session storage
 * - ISSUER_URL: Optional - Custom OIDC issuer URL
 */

import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

// Validate required environment variables
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

/**
 * Memoized OIDC configuration discovery
 * Caches the OpenID configuration for 1 hour to reduce network calls
 */
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

/**
 * Configures session middleware with appropriate storage backend
 * - Development: Uses in-memory store for simplicity
 * - Production: Uses PostgreSQL for persistence, falls back to memory if unavailable
 * @returns Express session middleware
 */
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  let sessionStore;
  if (isDevelopment) {
    // Use in-memory store for development
    console.log('Using memory session store for development');
    const MemStore = MemoryStore(session);
    sessionStore = new MemStore({
      checkPeriod: 86400000, // Prune expired entries every 24 hours
    });
  } else {
    // Production: prefer PostgreSQL for distributed session storage
    try {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: sessionTtl,
        tableName: "sessions",
      });
      console.log('Using PostgreSQL session store');
    } catch (error) {
      console.warn('Failed to connect to PostgreSQL session store, using memory store:', error);
      const MemStore = MemoryStore(session);
      sessionStore = new MemStore({
        checkPeriod: 86400000,
      });
    }
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: !isDevelopment, // HTTPS-only cookies in production
      maxAge: sessionTtl,
      sameSite: isDevelopment ? 'lax' : 'strict', // CSRF protection
    },
  });
}

/**
 * Updates user session with new OAuth tokens
 * @param user - User session object
 * @param tokens - OAuth token response from provider
 */
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

/**
 * Creates or updates user record from OAuth claims
 * @param claims - OpenID Connect claims from identity provider
 */
async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

/**
 * Initializes Passport.js with Replit OAuth strategy and configures auth routes
 * @param app - Express application instance
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;

    if (!req.isAuthenticated() || !user?.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.error('Authentication check failed:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
