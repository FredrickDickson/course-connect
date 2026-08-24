-- Check if the unique constraint exists
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'enrollments'::regclass
  AND contype = 'u'; -- 'u' is for UNIQUE constraints

-- Create the unique constraint if it doesn't exist
-- This prevents duplicate enrollments for the same user and course
ALTER TABLE public.enrollments 
DROP CONSTRAINT IF EXISTS enrollments_user_id_course_id_key;

ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_user_id_course_id_key 
UNIQUE (user_id, course_id);

-- Verify the constraint was created
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'enrollments'::regclass
  AND conname = 'enrollments_user_id_course_id_key';
