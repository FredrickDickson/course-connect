-- Update course level values from legacy terminology to new membership parts
-- Changes: beginner -> associate, intermediate -> member, advanced -> fellow

-- ============================================
-- 1. Update existing course level data
-- ============================================

UPDATE public.courses
SET level = 'associate'
WHERE level = 'beginner';

UPDATE public.courses
SET level = 'member'
WHERE level = 'intermediate';

UPDATE public.courses
SET level = 'fellow'
WHERE level = 'advanced';

-- ============================================
-- 2. Update default value for courses.level
-- ============================================

ALTER TABLE public.courses
ALTER COLUMN level SET DEFAULT 'associate';

-- ============================================
-- 3. Add check constraint for valid level values
-- ============================================

ALTER TABLE public.courses
ADD CONSTRAINT courses_level_check
CHECK (level IN ('associate', 'member', 'fellow'));

-- ============================================
-- 4. Update enrollment ticket_type values if they exist
-- ============================================

-- Check if enrollments table has ticket_type column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'course_enrollments'
    AND column_name = 'ticket_type'
  ) THEN
    UPDATE public.course_enrollments
    SET ticket_type = 'associate'
    WHERE ticket_type = 'beginner';

    UPDATE public.course_enrollments
    SET ticket_type = 'member'
    WHERE ticket_type = 'intermediate';

    UPDATE public.course_enrollments
    SET ticket_type = 'fellow'
    WHERE ticket_type = 'advanced';
  END IF;
END $$;
