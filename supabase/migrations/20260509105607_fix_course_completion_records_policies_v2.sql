-- Fix course completion records policies - ensure users can insert their own records
-- This migration ensures the RLS policies are properly configured

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own course completion records" ON public.course_completion_records;
DROP POLICY IF EXISTS "Service role can insert course completion records" ON public.course_completion_records;
DROP POLICY IF EXISTS "Users can view own course completion records" ON public.course_completion_records;
DROP POLICY IF EXISTS "Service role can view all course completion records" ON public.course_completion_records;

-- Create unified insert policy
CREATE POLICY "Users can insert own course completion records" 
  ON public.course_completion_records FOR INSERT
  WITH CHECK (
    -- Users can insert their own records
    auth.uid() = user_id
    OR
    -- Service role (for server-side operations)
    auth.uid() IS NULL
  );

-- Create select policy for users
CREATE POLICY "Users can view own course completion records"
  ON public.course_completion_records FOR SELECT
  USING (auth.uid() = user_id);

-- Create select policy for service role
CREATE POLICY "Service role can view all course completion records"
  ON public.course_completion_records FOR SELECT
  USING (auth.uid() IS NULL);