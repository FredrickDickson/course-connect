-- Check existing RLS policies on enrollments table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'enrollments';

-- Drop existing INSERT policy if it exists and recreate it
DROP POLICY IF EXISTS "Users can enroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "Users can insert their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.enrollments;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Users can enroll in courses"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Verify the new policy
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'enrollments' AND cmd = 'INSERT';
