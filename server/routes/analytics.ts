import { Router } from "express";
import type { Request, Response } from "express";
import { Mux } from "@mux/mux-node";
import { asyncHandler } from "../middleware/security";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../shared/database.types";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const router = Router();

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

// Get video analytics for a specific lesson
router.get(
  "/video/:lessonId",
  asyncHandler(async (req: Request, res: Response) => {
    const { lessonId } = req.params;

    try {
      // Get lesson details
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('mux_playback_id, mux_asset_id, title')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lesson) {
        return res.status(404).json({ 
          error: 'LESSON_NOT_FOUND',
          message: 'Lesson not found' 
        });
      }

      if (!lesson.mux_playback_id) {
        return res.status(400).json({ 
          error: 'NO_MUX_VIDEO',
          message: 'This lesson does not have a Mux video' 
        });
      }

      // Fetch Mux Data insights
      const insights = await mux.data.insights.list({
        filter: [`asset_id:${lesson.mux_asset_id}`],
        timeframe: ['30:days'],
      });

      res.json({
        lesson: {
          id: lessonId,
          title: lesson.title,
          muxPlaybackId: lesson.mux_playback_id,
          muxAssetId: lesson.mux_asset_id,
        },
        analytics: insights,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ 
        error: 'ANALYTICS_ERROR',
        message: 'Failed to fetch analytics' 
      });
    }
  }),
);

// Get overall course analytics
router.get(
  "/course/:courseId",
  asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params;

    try {
      // Get all lessons with Mux videos for this course
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          mux_playback_id,
          mux_asset_id,
          modules!inner(course_id)
        `)
        .eq('modules.course_id', courseId)
        .not('mux_playback_id', 'is', null);

      if (lessonsError) {
        return res.status(500).json({ 
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch lessons' 
        });
      }

      // Get progress data
      const { data: progress, error: progressError } = await supabase
        .from('progress')
        .select('lesson_id, watch_time_seconds, completed')
        .in('lesson_id', lessons?.map(l => l.id) || []);

      if (progressError) {
        return res.status(500).json({ 
          error: 'DATABASE_ERROR',
          message: 'Failed to fetch progress' 
        });
      }

      // Calculate aggregated stats
      const totalViews = progress?.length || 0;
      const completedLessons = progress?.filter(p => p.completed).length || 0;
      const totalWatchTime = progress?.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0) || 0;

      res.json({
        course: {
          id: courseId,
          totalMuxVideos: lessons?.length || 0,
          totalViews,
          completedLessons,
          totalWatchTime,
          averageWatchTime: totalViews > 0 ? Math.round(totalWatchTime / totalViews) : 0,
          completionRate: totalViews > 0 ? Math.round((completedLessons / totalViews) * 100) : 0,
        },
        lessons: lessons?.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          muxPlaybackId: lesson.mux_playback_id,
          views: progress?.filter(p => p.lesson_id === lesson.id).length || 0,
          avgWatchTime: Math.round(
            (progress
              ?.filter(p => p.lesson_id === lesson.id)
              .reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0) || 0) /
            (progress?.filter(p => p.lesson_id === lesson.id).length || 1)
          ),
        })),
      });
    } catch (error) {
      console.error('Course analytics error:', error);
      res.status(500).json({ 
        error: 'ANALYTICS_ERROR',
        message: 'Failed to fetch course analytics' 
      });
    }
  }),
);

// Update progress for Mux videos
router.post(
  "/progress",
  asyncHandler(async (req: Request, res: Response) => {
    const { lessonId, watchTimeSeconds, completed, userId } = req.body;

    if (!lessonId || !userId) {
      return res.status(400).json({ 
        error: 'MISSING_FIELDS',
        message: 'lessonId and userId are required' 
      });
    }

    try {
      // Upsert progress
      const { data: progress, error: progressError } = await supabase
        .from('progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          watch_time_seconds: watchTimeSeconds || 0,
          completed: completed || false,
          last_watched_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,lesson_id',
        })
        .select()
        .single();

      if (progressError) {
        return res.status(500).json({ 
          error: 'DATABASE_ERROR',
          message: 'Failed to update progress' 
        });
      }

      res.json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error('Progress update error:', error);
      res.status(500).json({ 
        error: 'PROGRESS_UPDATE_ERROR',
        message: 'Failed to update progress' 
      });
    }
  }),
);

// Get real-time viewer count for live streams (if applicable)
router.get(
  "/viewers/:playbackId",
  asyncHandler(async (req: Request, res: Response) => {
    const { playbackId } = req.params;

    try {
      // Fetch current viewers from Mux Data
      const views = await mux.data.views.list({
        filter: [`playback_id:${playbackId}`],
        timeframe: ['1:minutes'],
      });

      res.json({
        playbackId,
        currentViewers: views.data?.length || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Viewer count error:', error);
      res.status(500).json({ 
        error: 'VIEWER_COUNT_ERROR',
        message: 'Failed to fetch viewer count' 
      });
    }
  }),
);

export default router;
