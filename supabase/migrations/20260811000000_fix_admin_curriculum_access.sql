-- Fix admin access to modules and lessons when creating courses on behalf of instructors
-- Admins should be able to manage curriculum for any course

-- Drop existing policies
DROP POLICY IF EXISTS "Instructors can manage modules of their courses" ON modules;
DROP POLICY IF EXISTS "Instructors can manage lessons of their modules" ON lessons;
DROP POLICY IF EXISTS "modules_instructors_create" ON modules;
DROP POLICY IF EXISTS "modules_instructors_update" ON modules;
DROP POLICY IF EXISTS "modules_instructors_delete" ON modules;

-- Recreate modules policies with admin access
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

-- Recreate lessons policies with admin access
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

-- Also ensure admins can manage quizzes and assignments for any course
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

-- Also fix lesson_resources access for admins
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
