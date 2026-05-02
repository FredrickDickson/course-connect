/**
 * Routes Index - Barrel file that registers all routers
 */

import { Router } from "express";
import type { Express, Request, Response } from "express";
import authRouter from "./auth";
import coursesRouter from "./courses";
import enrollmentsRouter from "./enrollments";
import quizzesRouter from "./quizzes";
import adminRouter from "./admin";
import videosRouter from "./videos";
import qualificationRouter from "./qualification";
import certificatesRouter from "./certificates";
import renewalRouter from "./renewal";

export function registerAPIRoutes(app: Express): void {
  // Mount all API routers
  app.use("/api/auth", authRouter);
  app.use("/api/courses", coursesRouter);
  app.use("/api/enrollments", enrollmentsRouter);
  app.use("/api/quizzes", quizzesRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/videos", videosRouter);
  app.use("/api/qualification", qualificationRouter);
  app.use("/api/certificates", certificatesRouter);
  app.use("/api/renewal", renewalRouter);

  // 404 handler for unknown API routes
  app.use("/api/*", (req: Request, res: Response) => {
    res.status(404).json({ error: "API endpoint not found" });
  });
}

export { authRouter, coursesRouter, enrollmentsRouter, quizzesRouter, adminRouter, videosRouter, qualificationRouter, certificatesRouter, renewalRouter };
