import 'dotenv/config';
import express from "express";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth-routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// The Paystack webhook needs the raw request body (via express.raw()) to
// verify its HMAC signature — it must be exempted from the global JSON
// parser, since body-parser middleware only runs once per request and an
// earlier express.json() would otherwise consume the stream first, leaving
// the webhook route with an already-parsed object instead of a Buffer.
const RAW_BODY_PATHS = new Set(["/api/paystack-webhook"]);
app.use((req, res, next) => {
  if (RAW_BODY_PATHS.has(req.path)) return next();
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register auth routes (register, login, etc.)
  registerAuthRoutes(app);

  // Register API routes (registers its own env-aware error handler,
  // server/middleware/security.ts errorHandler, as its last middleware)
  const server = await registerRoutes(app);

  // Setup Vite or static assets depending on environment
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const port = parseInt(process.env.PORT || "8080", 10);
  server.listen(port, "0.0.0.0", () => {
    log(`Server running on http://localhost:${port}`);
  });
})();
