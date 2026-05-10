-- Fix users table RLS so authenticated users can read their own role
-- and instructors can be read by anyone (needed for course display)

-- Drop existing policies to avoid conflicts, then recreate
DROP POLICY IF EXISTS "users_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_view_instructor_profiles" ON public.users;

-- Allow every authenticated user to read their own row (includes role)
CREATE POLICY "users_view_own_profile"
  ON public.users FOR SELECT
  USING (auth.uid()::text = id);

-- Allow every authenticated user to read instructor rows
-- (needed so course listings can show instructor names)
CREATE POLICY "users_view_instructor_profiles"
  ON public.users FOR SELECT
  USING (role = 'instructor');
