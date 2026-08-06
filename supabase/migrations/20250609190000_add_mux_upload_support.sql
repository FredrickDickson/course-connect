-- Add Mux upload support to lessons and create mux_assets table

-- Add mux columns to lessons table
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS mux_asset_id text,
ADD COLUMN IF NOT EXISTS mux_playback_id text,
ADD COLUMN IF NOT EXISTS mux_status text DEFAULT 'pending';

-- Create mux_assets tracking table
CREATE TABLE IF NOT EXISTS public.mux_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    mux_asset_id text NOT NULL,
    mux_playback_id text,
    upload_status text DEFAULT 'pending' NOT NULL,
    asset_status text DEFAULT 'preparing',
    upload_url text,
    duration_seconds integer,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add index for lookups by mux_asset_id
CREATE UNIQUE INDEX IF NOT EXISTS mux_assets_mux_asset_id_idx ON public.mux_assets(mux_asset_id);
CREATE INDEX IF NOT EXISTS mux_assets_lesson_id_idx ON public.mux_assets(lesson_id);

-- Enable RLS
ALTER TABLE public.mux_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for mux_assets
DROP POLICY IF EXISTS "Instructors can manage their own mux assets" ON public.mux_assets;
CREATE POLICY "Instructors can manage their own mux assets"
ON public.mux_assets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        WHERE l.id = mux_assets.lesson_id
        AND c.instructor_id::text = auth.uid()::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        WHERE l.id = mux_assets.lesson_id
        AND c.instructor_id::text = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "Students can view mux assets for enrolled courses" ON public.mux_assets;
CREATE POLICY "Students can view mux assets for enrolled courses"
ON public.mux_assets
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        JOIN public.enrollments e ON e.course_id = c.id
        WHERE l.id = mux_assets.lesson_id
        AND e.user_id::text = auth.uid()::text
    )
);

-- Allow service role full access
DROP POLICY IF EXISTS "Service role can manage mux assets" ON public.mux_assets;
CREATE POLICY "Service role can manage mux assets"
ON public.mux_assets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mux_assets_updated_at ON public.mux_assets;
CREATE TRIGGER update_mux_assets_updated_at
    BEFORE UPDATE ON public.mux_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
