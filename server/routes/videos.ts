/**
 * Videos Routes - /api/videos/* endpoints
 * Handles external video URL validation and metadata extraction
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { validateAndExtractVideoUrl, generateEmbedUrl } from "../utils/videoValidator";
import { asyncHandler } from "../middleware/security";

const router = Router();

/**
 * POST /api/videos/validate
 * Validate a video URL and extract metadata
 * Body: { url: string }
 * Returns: { platform: 'youtube'|'vimeo', videoId: string, thumbnailUrl?: string }
 */
router.post(
  "/validate",
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ 
        error: "MISSING_URL",
        message: "URL is required" 
      });
    }

    const result = validateAndExtractVideoUrl(url);

    if ("error" in result) {
      return res.status(400).json(result);
    }

    // Generate embed URL for convenience
    const embedUrl = generateEmbedUrl(result.platform, result.videoId);

    res.json({
      ...result,
      embedUrl,
    });
  }),
);

/**
 * POST /api/videos/embed-url
 * Generate embed URL from platform and video ID
 * Body: { platform: 'youtube'|'vimeo', videoId: string }
 * Returns: { embedUrl: string }
 */
router.post(
  "/embed-url",
  asyncHandler(async (req: Request, res: Response) => {
    const { platform, videoId } = req.body;

    if (!platform || !videoId) {
      return res.status(400).json({ 
        error: "MISSING_PARAMS",
        message: "Platform and videoId are required" 
      });
    }

    if (platform !== "youtube" && platform !== "vimeo") {
      return res.status(400).json({ 
        error: "INVALID_PLATFORM",
        message: "Platform must be 'youtube' or 'vimeo'" 
      });
    }

    try {
      const embedUrl = generateEmbedUrl(platform, videoId);
      res.json({ embedUrl });
    } catch (error) {
      res.status(400).json({ 
        error: "GENERATION_FAILED",
        message: "Failed to generate embed URL" 
      });
    }
  }),
);

export default router;
