-- ============================================
-- Fix RLS Policies for VARCHAR user IDs
-- The policies were created with UUID casting, but users.id is VARCHAR
-- Run this in PRODUCTION Supabase SQL Editor
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all forms" ON personal_notes_forms;
DROP POLICY IF EXISTS "Admins can update forms" ON personal_notes_forms;

-- Recreate SELECT policy with correct type handling
CREATE POLICY "Admins can view all forms"
  ON personal_notes_forms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()::text
      AND public.users.role = 'admin'
    )
  );

-- Recreate UPDATE policy with correct type handling
CREATE POLICY "Admins can update forms"
  ON personal_notes_forms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()::text
      AND public.users.role = 'admin'
    )
  );

-- Verify all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive
FROM pg_policies 
WHERE tablename = 'personal_notes_forms'
ORDER BY cmd;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS policies fixed for VARCHAR user IDs';
  RAISE NOTICE 'Admins should now be able to view and update forms';
  RAISE NOTICE '============================================';
END $$;
