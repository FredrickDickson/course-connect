-- ============================================================================
-- MIGRATION: Add course_type field to courses table
-- Purpose: Distinguish between ONLINE and PHYSICAL courses
-- Date: 2026-04-26
-- ============================================================================

-- Add course_type column with check constraint
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS course_type VARCHAR(20) DEFAULT 'ONLINE';

-- Add check constraint for valid values
ALTER TABLE public.courses 
  DROP CONSTRAINT IF EXISTS courses_course_type_check;

ALTER TABLE public.courses 
  ADD CONSTRAINT courses_course_type_check 
  CHECK (course_type IN ('ONLINE', 'PHYSICAL'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_courses_course_type ON public.courses(course_type);

-- Update existing courses based on heuristics
-- Physical courses typically have venue-related fields populated
UPDATE public.courses 
SET course_type = 'PHYSICAL'
WHERE 
  -- Has venue/location fields populated
  (venue IS NOT NULL AND venue != '') OR
  (address IS NOT NULL AND address != '') OR
  -- Has specific keywords in title
  title ~* '(workshop|summit|conference|symposium|oxfordshire|in-person|residential|intensive week)'
  AND course_type IS NULL;

-- Default remaining to ONLINE
UPDATE public.courses 
SET course_type = 'ONLINE'
WHERE course_type IS NULL;

-- Update RLS policies to include course_type visibility
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Ensure course_type is visible in select policies
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- ============================================================================
-- Add venue details fields for physical courses
-- ============================================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS venue VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS schedule_details JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- Create view for course catalog with type info
-- ============================================================================

CREATE OR REPLACE VIEW public.course_catalog_view AS
SELECT 
  c.*,
  cat.name as category_name,
  CASE 
    WHEN c.course_type = 'PHYSICAL' THEN 
      jsonb_build_object(
        'venue', c.venue,
        'address', c.address,
        'city', c.city,
        'country', c.country,
        'start_date', c.start_date,
        'end_date', c.end_date
      )
    ELSE NULL
  END as venue_details
FROM public.courses c
LEFT JOIN public.categories cat ON c.category_id = cat.id
WHERE c.is_published = true;

-- ============================================================================
-- Log migration
-- ============================================================================

DO $$
DECLARE
  v_online_count INTEGER;
  v_physical_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_online_count FROM public.courses WHERE course_type = 'ONLINE';
  SELECT COUNT(*) INTO v_physical_count FROM public.courses WHERE course_type = 'PHYSICAL';
  
  RAISE NOTICE 'Course Type Migration Complete:';
  RAISE NOTICE '  - Online courses: %', v_online_count;
  RAISE NOTICE '  - Physical courses: %', v_physical_count;
END $$;
