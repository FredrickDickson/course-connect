import { Router } from "express";
import type { Request, Response } from "express";
import { Mux } from "@mux/mux-node";
import { body, validationResult } from "express-validator";
import { asyncHandler } from "../middleware/security";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../shared/database.types";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import { validateAndExtractVideoUrl } from "../utils/videoValidator";

const router = Router();

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Generate direct upload URL for Mux
router.post(
  '/upload-url',
  [
    body('lessonId').isUUID().withMessage('Valid lesson ID required'),
    body('fileName').notEmpty().withMessage('File name required'),
    body('fileSize').isInt({ min: 1, max: 5 * 1024 * 1024 * 1024 }).withMessage('File size must be between 1 byte and 5GB'),
  ],
  asyncHandler(async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: errors.array()
      });
    }

    const { lessonId, fileName, fileSize } = req.body;

    try {
      // Verify user is instructor of this lesson
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select(`
          *,
          modules!inner(
            course_id,
            courses!inner(
              instructor_id
            )
          )
        `)
        .eq('id', lessonId)
        .single();

      if (lessonError || !lesson) {
        return res.status(404).json({ 
          error: 'LESSON_NOT_FOUND',
          message: 'Lesson not found' 
        });
      }

      // Check if user is the instructor
      if (lesson.modules?.courses?.instructor_id !== req.user?.id) {
        return res.status(403).json({ 
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only instructors can upload videos' 
        });
      }

      // Create Mux upload with passthrough for tracking
      const upload = await mux.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['signed'],
          mp4_support: 'standard',
          passthrough: lessonId, // Pass lesson ID for webhook correlation
        },
        cors_origin: process.env.CLIENT_URL || 'http://localhost:5173',
        timeout: 3600, // 1 hour timeout
      });

      // Create record in mux_assets table
      const { data: muxAsset, error: muxAssetError } = await supabase
        .from('mux_assets')
        .insert({
          lesson_id: lessonId,
          mux_asset_id: upload.asset_id || '',
          mux_playback_id: '', // Will be populated when asset is ready
          upload_status: 'pending',
          upload_url: upload.url || '',
        })
        .select()
        .single();

      if (muxAssetError) {
        return res.status(500).json({ 
          error: 'DATABASE_ERROR',
          message: 'Failed to create upload record' 
        });
      }

      res.json({
        uploadId: upload.id,
        uploadUrl: upload.url,
        assetId: upload.asset_id,
        muxAssetId: muxAsset.id,
      });
    } catch (error) {
      console.error('Mux upload error:', error);
      res.status(500).json({ 
        error: 'UPLOAD_ERROR',
        message: 'Failed to create upload URL' 
      });
    }
  }),
);

// Handle Mux webhooks for asset status updates
router.post(
  '/webhook',
  asyncHandler(async (req: any, res: any) => {
    const signature = req.headers['mux-signature'];
    const body = JSON.stringify(req.body);

    // Verify webhook signature
    if (!process.env.MUX_WEBHOOK_SIGNING_SECRET) {
      console.warn('Mux webhook signing secret not configured, skipping signature verification');
    } else if (signature) {
      try {
        const isValid = mux.webhooks.verifySignature(body, signature, process.env.MUX_WEBHOOK_SIGNING_SECRET);
        if (!isValid) {
          return res.status(401).json({ error: 'INVALID_SIGNATURE' });
        }
      } catch (error) {
        return res.status(401).json({ error: 'SIGNATURE_VERIFICATION_FAILED' });
      }
    }

    const { type, data } = req.body;

    try {
      switch (type) {
        case 'video.asset.ready':
          await handleAssetReady(data);
          break;
        case 'video.asset.created':
          await handleAssetCreated(data);
          break;
        case 'video.asset.errored':
          await handleAssetError(data);
          break;
        default:
          console.log('Unhandled webhook type:', type);
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'WEBHOOK_PROCESSING_ERROR' });
    }
  }),
);

// Get asset status
router.get(
  '/asset/:assetId',
  asyncHandler(async (req: any, res: any) => {
    const { assetId } = req.params;

    try {
      const asset = await mux.video.assets.retrieve(assetId);
      
      // Find corresponding mux_asset record
      const { data: muxAsset, error: muxAssetError } = await supabase
        .from('mux_assets')
        .select('*')
        .eq('mux_asset_id', assetId)
        .single();

      if (muxAssetError) {
        return res.status(404).json({ 
          error: 'ASSET_NOT_FOUND',
          message: 'Asset record not found' 
        });
      }

      res.json({
        asset,
        muxAsset,
      });
    } catch (error) {
      console.error('Get asset error:', error);
      res.status(500).json({ 
        error: 'ASSET_RETRIEVAL_ERROR',
        message: 'Failed to retrieve asset' 
      });
    }
  }),
);

// Helper functions for webhook handling
async function handleAssetReady(data: any) {
  const { id, playback_ids, passthrough } = data;

  // Update mux_assets table
  await supabase
    .from('mux_assets')
    .update({
      upload_status: 'ready',
      mux_playback_id: playback_ids[0]?.id || '',
      asset_status: 'ready',
      duration_seconds: data.duration,
    })
    .eq('mux_asset_id', id);

  // Update lessons table with playback ID using passthrough if available
  if (passthrough) {
    await supabase
      .from('lessons')
      .update({
        mux_playback_id: playback_ids[0]?.id || '',
        mux_status: 'ready',
      })
      .eq('id', passthrough);
  } else {
    // Fallback to old method
    await supabase
      .from('lessons')
      .update({
        mux_playback_id: playback_ids[0]?.id || '',
        mux_status: 'ready',
      })
      .eq('mux_asset_id', id);
  }
}

async function handleAssetCreated(data: any) {
  const { id } = data;

  await supabase
    .from('mux_assets')
    .update({
      upload_status: 'preparing',
      asset_status: 'preparing',
    })
    .eq('mux_asset_id', id);
}

async function handleAssetError(data: any) {
  const { id, errors, passthrough } = data;

  await supabase
    .from('mux_assets')
    .update({
      upload_status: 'errored',
      asset_status: 'errored',
    })
    .eq('mux_asset_id', id);

  // Update lessons table using passthrough if available
  if (passthrough) {
    await supabase
      .from('lessons')
      .update({
        mux_status: 'errored',
      })
      .eq('id', passthrough);
  } else {
    // Fallback to old method
    await supabase
      .from('lessons')
      .update({
        mux_status: 'errored',
      })
      .eq('mux_asset_id', id);
  }

  console.error('Mux asset error:', errors);
}

export default router;
