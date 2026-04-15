-- Add columns for external video hosting (YouTube/Vimeo)
-- These work alongside existing video_url column for direct uploads
ALTER TABLE public.lessons 
  ADD COLUMN IF NOT EXISTS video_platform varchar CHECK (video_platform IN ('youtube', 'vimeo')),
  ADD COLUMN IF NOT EXISTS video_id varchar;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_video_platform ON public.lessons(video_platform);
CREATE INDEX IF NOT EXISTS idx_lessons_video_id ON public.lessons(video_id);

-- Add comment to document the dual video source approach
COMMENT ON COLUMN public.lessons.video_url IS 'Direct video upload URL (Supabase Storage)';
COMMENT ON COLUMN public.lessons.video_platform IS 'External video platform: youtube or vimeo';
COMMENT ON COLUMN public.lessons.video_id IS 'External video ID from YouTube or Vimeo';