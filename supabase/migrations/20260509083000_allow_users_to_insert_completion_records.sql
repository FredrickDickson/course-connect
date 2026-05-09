-- Allow users to insert their own course completion records
-- This fixes the 403 error when users complete courses

DROP POLICY IF EXISTS "System can insert course completion records" ON public.course_completion_records;

CREATE POLICY "Users can insert own course completion records"
  ON public.course_completion_records FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Allow service role (for server-side operations)
CREATE POLICY "Service role can insert course completion records"
  ON public.course_completion_records FOR INSERT
  WITH CHECK (auth.uid() IS NULL);
