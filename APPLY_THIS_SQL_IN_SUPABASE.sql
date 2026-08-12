-- ============================================
-- FIX ADMIN ACCESS TO CURRICULUM
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Instructors can manage modules of their courses" ON modules;
DROP POLICY IF EXISTS "Instructors can manage lessons of their modules" ON lessons;
DROP POLICY IF EXISTS "modules_instructors_create" ON modules;
DROP POLICY IF EXISTS "modules_instructors_update" ON modules;
DROP POLICY IF EXISTS "modules_instructors_delete" ON modules;

-- Create new modules policy with admin access
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

-- Create new lessons policy with admin access
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

-- Update quizzes policy
DROP POLICY IF EXISTS "Instructors can manage quizzes" ON quizzes;
CREATE POLICY "Instructors and admins can manage quizzes"
  ON quizzes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons 
      JOIN modules ON lessons.module_id = modules.id
      JOIN courses ON modules.course_id = courses.id 
      WHERE lessons.id = lesson_id 
      AND (
        auth.uid()::text = courses.instructor_id 
        OR public.is_admin(auth.uid()::text)
      )
    )
  );

-- Update assignments policy  
DROP POLICY IF EXISTS "Instructors can manage assignments" ON assignments;
CREATE POLICY "Instructors and admins can manage assignments"
  ON assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons 
      JOIN modules ON lessons.module_id = modules.id
      JOIN courses ON modules.course_id = courses.id 
      WHERE lessons.id = lesson_id 
      AND (
        auth.uid()::text = courses.instructor_id 
        OR public.is_admin(auth.uid()::text)
      )
    )
  );

-- Update lesson_resources policy (check if table exists first)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lesson_resources') THEN
    DROP POLICY IF EXISTS "resources_write_owner" ON lesson_resources;
    
    CREATE POLICY "Instructors and admins can manage lesson resources"
      ON lesson_resources
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM lessons 
          JOIN modules ON lessons.module_id = modules.id
          JOIN courses ON modules.course_id = courses.id 
          WHERE lessons.id = lesson_id 
          AND (
            auth.uid()::text = courses.instructor_id 
            OR public.is_admin(auth.uid()::text)
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lessons 
          JOIN modules ON lessons.module_id = modules.id
          JOIN courses ON modules.course_id = courses.id 
          WHERE lessons.id = lesson_id 
          AND (
            auth.uid()::text = courses.instructor_id 
            OR public.is_admin(auth.uid()::text)
          )
        )
      );
  END IF;
END $$;

-- Verify the changes
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('modules', 'lessons', 'quizzes', 'assignments', 'lesson_resources')
ORDER BY tablename, policyname;
