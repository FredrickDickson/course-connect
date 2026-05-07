-- Simplify quiz SELECT RLS policies to fix 406 errors
-- Replace nested EXISTS queries with direct JOINs

-- Drop existing complex SELECT policies
DROP POLICY IF EXISTS "quizzes_instructors_view" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_view_enrolled" ON public.quizzes;

-- Create simplified SELECT policy for instructors using direct JOIN
CREATE POLICY "quizzes_instructors_view" ON public.quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.courses c ON c.id = m.course_id
      WHERE l.id = quizzes.lesson_id
      AND c.instructor_id = auth.uid()::text
    )
  );

-- Create simplified SELECT policy for enrolled students using direct JOIN
CREATE POLICY "quizzes_view_enrolled" ON public.quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.courses c ON c.id = m.course_id
      JOIN public.enrollments e ON e.course_id = c.id
      WHERE l.id = quizzes.lesson_id
      AND e.user_id = auth.uid()::text
    )
  );
