/**
 * Certifications Routes - /api/certifications/* endpoints
 * Generic per-course "Certificate of Completion" records (certifications
 * table) - independent of the CIMA professional certificates table.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { requireSupabaseAuth } from "../supabaseAuth";
import { asyncHandler } from "../middleware/security";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

// Get a single certification (Certificate of Completion) by id
router.get(
  "/:id",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const certification = await storage.getCertificationById(id);
    if (!certification) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    const isOwner = certification.user_id === userId;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this certificate" });
    }

    res.json({
      id: certification.id,
      fullName: [certification.user?.first_name, certification.user?.last_name]
        .filter(Boolean)
        .join(" "),
      courseTitle: certification.course?.title,
      issuedAt: certification.issued_at,
    });
  }),
);

export default router;
