-- Add Mux video streaming support to lessons table
-- This extends the existing video platform support to include Mux alongside YouTube/Vimeo

-- Add Mux-specific columns to lessons table
ALTER TABLE public.lessons 
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_upload_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS mux_thumbnail_time INTEGER DEFAULT 0;

-- Update video_platform check constraint to include Mux
ALTER TABLE public.lessons 
  DROP CONSTRAINT IF EXISTS lessons_video_platform_check;

ALTER TABLE public.lessons 
  ADD CONSTRAINT lessons_video_platform_check 
  CHECK (video_platform IN ('youtube', 'vimeo', 'mux') OR video_platform IS NULL);

-- Add comment to document Mux columns
COMMENT ON COLUMN public.lessons.mux_playback_id IS 'Mux playback ID for streaming video player';
COMMENT ON COLUMN public.lessons.mux_asset_id IS 'Mux asset ID from upload API';
COMMENT ON COLUMN public.lessons.mux_upload_id IS 'Mux direct upload ID for tracking uploads';
COMMENT ON COLUMN public.lessons.mux_status IS 'Mux processing status: pending, preparing, ready, errored';
COMMENT ON COLUMN public.lessons.mux_thumbnail_time IS 'Thumbnail time offset in seconds for Mux video thumbnails';

-- Update existing video_platform comment to include Mux
COMMENT ON COLUMN public.lessons.video_platform IS 'Video platform: youtube, vimeo, or mux';

-- Add indexes for Mux columns for performance
CREATE INDEX IF NOT EXISTS idx_lessons_mux_playback_id ON public.lessons(mux_playback_id);
CREATE INDEX IF NOT EXISTS idx_lessons_mux_asset_id ON public.lessons(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_lessons_mux_status ON public.lessons(mux_status);

-- Create mux_assets table for tracking Mux uploads and processing
CREATE TABLE IF NOT EXISTS public.mux_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  mux_asset_id TEXT NOT NULL UNIQUE,
  mux_playback_id TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'preparing', 'processing', 'ready', 'errored')),
  upload_url TEXT,
  asset_status TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for mux_assets table
CREATE INDEX IF NOT EXISTS idx_mux_assets_lesson_id ON public.mux_assets(lesson_id);
CREATE INDEX IF NOT EXISTS idx_mux_assets_upload_status ON public.mux_assets(upload_status);
CREATE INDEX IF NOT EXISTS idx_mux_assets_mux_asset_id ON public.mux_assets(mux_asset_id);

-- Enable RLS on mux_assets table
ALTER TABLE public.mux_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for mux_assets
CREATE POLICY "mux_assets_instructors_view_own" ON public.mux_assets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id 
    WHERE lessons.id = mux_assets.lesson_id AND courses.instructor_id = auth.uid()::text
  )
);

CREATE POLICY "mux_assets_instructors_create" ON public.mux_assets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id 
    WHERE lessons.id = mux_assets.lesson_id AND courses.instructor_id = auth.uid()::text
  )
);

CREATE POLICY "mux_assets_instructors_update" ON public.mux_assets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id 
    WHERE lessons.id = mux_assets.lesson_id AND courses.instructor_id = auth.uid()::text
  )
);

CREATE POLICY "mux_assets_instructors_delete" ON public.mux_assets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id 
    WHERE lessons.id = mux_assets.lesson_id AND courses.instructor_id = auth.uid()::text
  )
);
