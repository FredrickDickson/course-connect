-- ============================================
-- SIMPLIFIED FIX FOR ADMIN CURRICULUM ACCESS
-- Run this in Supabase SQL Editor
-- ============================================

-- Fix modules table - Allow admins to manage all modules
DROP POLICY IF EXISTS "Instructors can manage modules of their courses" ON modules;
DROP POLICY IF EXISTS "modules_instructors_create" ON modules;
DROP POLICY IF EXISTS "modules_instructors_update" ON modules;
DROP POLICY IF EXISTS "modules_instructors_delete" ON modules;
DROP POLICY IF EXISTS "Instructors and admins can manage modules" ON modules;

CREATE POLICY "Instructors and admins can manage modules"
  ON modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id 
      AND (
        auth.uid()::text = instructor_id 
        OR public.is_admin(auth.uid()::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = course_id 
      AND (
        auth.uid()::text = instructor_id 
        OR public.is_admin(auth.uid()::text)
      )
    )
  );

-- Fix lessons table - Allow admins to manage all lessons
DROP POLICY IF EXISTS "Instructors can manage lessons of their modules" ON lessons;
DROP POLICY IF EXISTS "Instructors and admins can manage lessons" ON lessons;

CREATE POLICY "Instructors and admins can manage lessons"
  ON lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM modules 
      JOIN courses ON modules.course_id = courses.id 
      WHERE modules.id = module_id 
      AND (
        auth.uid()::text = courses.instructor_id 
        OR public.is_admin(auth.uid()::text)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules 
      JOIN courses ON modules.course_id = courses.id 
      WHERE modules.id = module_id 
      AND (
        auth.uid()::text = courses.instructor_id 
        OR public.is_admin(auth.uid()::text)
      )
    )
  );

-- Verify the policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('modules', 'lessons')
  AND policyname LIKE '%admin%'
ORDER BY tablename, policyname;
