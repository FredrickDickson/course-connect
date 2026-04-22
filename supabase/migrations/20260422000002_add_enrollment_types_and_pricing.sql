-- Add enrollment types and per-level pricing to support eligibility-driven enrollment flow

-- Update courses table to add track and per-level pricing
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS track varchar DEFAULT 'ARBITRATION' CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  ADD COLUMN IF NOT EXISTS associate_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS member_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS fellow_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ticket_types jsonb;

-- Update enrollments table to add enrollment type and status
ALTER TABLE public.enrollments 
  ADD COLUMN IF NOT EXISTS enrollment_type varchar DEFAULT 'COURSE' CHECK (enrollment_type IN ('COURSE', 'APPLICATION', 'ASSESSMENT')),
  ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS enrollment_level varchar CHECK (enrollment_level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.fellowship_applications(id) ON DELETE SET NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_type ON public.enrollments(enrollment_type);
CREATE INDEX IF NOT EXISTS idx_courses_track ON public.courses(track);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);

-- Update existing courses to have default pricing based on their level
UPDATE public.courses 
SET 
  associate_price = CASE 
    WHEN level = 'associate' THEN price 
    ELSE price * 0.6 
  END,
  member_price = CASE 
    WHEN level = 'member' THEN price 
    ELSE price * 0.8 
  END,
  fellow_price = CASE 
    WHEN level = 'fellow' THEN price 
    ELSE price * 1.2 
  END,
  track = 'ARBITRATION'
WHERE associate_price IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN public.courses.track IS 'Track: ARBITRATION or MEDIATION';
COMMENT ON COLUMN public.courses.associate_price IS 'Price for Associate level enrollment';
COMMENT ON COLUMN public.courses.member_price IS 'Price for Member level enrollment';
COMMENT ON COLUMN public.courses.fellow_price IS 'Price for Fellow level enrollment';
COMMENT ON COLUMN public.courses.requires_approval IS 'Whether this course requires admin approval before enrollment';
COMMENT ON COLUMN public.enrollments.enrollment_type IS 'Type: COURSE (standard), APPLICATION (fellowship), ASSESSMENT (expedited)';
COMMENT ON COLUMN public.enrollments.status IS 'Status: PENDING_APPROVAL, APPROVED, REJECTED, ACTIVE, COMPLETED, FAILED';
COMMENT ON COLUMN public.enrollments.enrollment_level IS 'Level at which user enrolled: ASSOCIATE, MEMBER, FELLOW';
