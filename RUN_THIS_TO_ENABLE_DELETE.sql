-- ============================================
-- Enable DELETE functionality for Personal Notes Forms
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop the policy if it already exists (to avoid errors)
DROP POLICY IF EXISTS "Admins can delete forms" ON personal_notes_forms;

-- Step 2: Create the DELETE policy for admins
-- Note: users.id is VARCHAR, not UUID, so we DON'T cast it
CREATE POLICY "Admins can delete forms"
  ON personal_notes_forms
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()::text
      AND public.users.role = 'admin'
    )
  );

-- Step 3: Verify ALL policies on the table
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'personal_notes_forms'
ORDER BY cmd;

-- Step 4: Enable RLS if not already enabled
ALTER TABLE personal_notes_forms ENABLE ROW LEVEL SECURITY;

-- Step 5: Test your current user role
SELECT 
  auth.uid()::text as your_user_id,
  u.role as your_role,
  CASE 
    WHEN u.role = 'admin' 
    THEN '✅ You ARE an admin - DELETE will work'
    ELSE '❌ You are NOT an admin - DELETE will NOT work'
  END as delete_access_status
FROM users u
WHERE u.id = auth.uid()::text;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DELETE policy configured successfully!';
  RAISE NOTICE 'Check the query results above to verify your admin access';
  RAISE NOTICE '============================================';
END $$;
