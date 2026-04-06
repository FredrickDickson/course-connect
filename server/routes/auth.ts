/**
 * Auth Routes - /api/auth/* endpoints
 */

import { Router, Request as ExpressRequest } from "express";
import type { Response } from "express";
import { storage } from "../storage";
import { requireSupabaseAuth } from "../supabaseAuth";
import { uploadLimiter, asyncHandler } from "../middleware/security";
import { profileImageUpload, handleUploadError, getFileUrl } from "../middleware/upload";

interface AuthRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
  file?: Express.Multer.File;
}

const router = Router();

// Get current user
router.get(
  "/user",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  }),
);

// Upload profile image
router.post(
  "/profile/image",
  requireSupabaseAuth,
  uploadLimiter,
  profileImageUpload.single("image"),
  handleUploadError,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const userId = req.user.claims.sub;
    const imageUrl = getFileUrl(req, req.file.filename, "image");

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await storage.upsertUser({
      ...user,
      profileImageUrl: imageUrl,
    });

    res.json({
      message: "Profile image updated successfully",
      profileImageUrl: imageUrl,
      user: updatedUser,
    });
  }),
);

export default router;
