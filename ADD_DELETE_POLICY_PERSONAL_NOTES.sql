-- ============================================
-- Add DELETE policy for personal_notes_forms
-- Allows admins to delete form submissions
-- ============================================

-- Policy: Admins can delete forms
CREATE POLICY "Admins can delete forms"
  ON personal_notes_forms
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id::uuid = auth.uid()
      AND public.users.role = 'admin'
    )
  );

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'personal_notes_forms'
AND cmd = 'DELETE';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ DELETE policy added for personal_notes_forms';
  RAISE NOTICE 'Admins can now delete form submissions';
END $$;
