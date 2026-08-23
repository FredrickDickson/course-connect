-- Check if status and enrollment_type columns exist in enrollments table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'enrollments'
  AND column_name IN ('status', 'enrollment_type', 'enrollment_level')
ORDER BY column_name;

-- If the columns don't exist, add them:
ALTER TABLE public.enrollments 
  ADD COLUMN IF NOT EXISTS enrollment_type varchar DEFAULT 'COURSE' CHECK (enrollment_type IN ('COURSE', 'APPLICATION', 'ASSESSMENT')),
  ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'ACTIVE' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'FAILED')),
  ADD COLUMN IF NOT EXISTS enrollment_level varchar CHECK (enrollment_level IN ('ASSOCIATE', 'MEMBER', 'FELLOW'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON public.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_type ON public.enrollments(enrollment_type);

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;
