-- 20260811000000_fix_admin_curriculum_access.sql was only partially applied to
-- production: it correctly added "Instructors and admins can manage modules"
-- and "...lessons", but the three DROP POLICY IF EXISTS targets it used for
-- quizzes/assignments/lesson_resources ("Instructors can manage quizzes" /
-- "...assignments", "resources_write_owner") no longer matched the actual live
-- policy names on those tables (they'd already been split into per-command
-- policies by the 2026-05-07 quiz RLS iteration), so those three CREATE POLICY
-- statements silently never ran. Verified directly against the live database:
-- quizzes/assignments/lesson_resources have no admin-bypass policy today, only
-- instructor-scoped ones (quizzes_instructors_create/update/delete,
-- assignments_insert/update/delete, resources_write_owner) - meaning an admin
-- creating/editing a quiz, assignment, or lesson resource on a course they
-- don't personally own is currently rejected by RLS. This adds the missing
-- admin-inclusive policies without touching the existing instructor-scoped
-- ones (RLS permissive policies are OR'd together, so this is purely additive).

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
