-- Fix conflicting RLS policies for course_completion_records
-- This resolves the 403 error when users complete courses

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "System can insert course completion records" ON public.course_completion_records;
DROP POLICY IF EXISTS "Users can insert own course completion records" ON public.course_completion_records;
DROP POLICY IF EXISTS "Service role can insert course completion records" ON public.course_completion_records;

-- Create unified policy that allows both users and service role
CREATE POLICY "Users can insert own course completion records" 
  ON public.course_completion_records FOR INSERT
  WITH CHECK (
    -- Users can insert their own records
    auth.uid() = user_id
    OR
    -- Service role (for server-side operations)
    auth.uid() IS NULL
  );

-- Ensure users can view their own completion records
CREATE POLICY "Users can view own course completion records"
  ON public.course_completion_records FOR SELECT
  USING (auth.uid() = user_id);

-- Ensure service role can view all records for admin operations
CREATE POLICY "Service role can view all course completion records"
  ON public.course_completion_records FOR SELECT
  USING (auth.uid() IS NULL);
