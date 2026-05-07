-- Simplify quiz INSERT RLS policies to avoid timeouts
-- Replace nested EXISTS queries with direct foreign key checks

-- Drop existing complex INSERT policies
DROP POLICY IF EXISTS "quiz_questions_instructors_insert" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_answers_instructors_insert" ON public.quiz_answers;

-- Create simplified INSERT policy for quiz_questions using direct JOIN
CREATE POLICY "quiz_questions_instructors_insert" ON public.quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.courses c ON c.id = m.course_id
      WHERE q.id = quiz_questions.quiz_id
      AND c.instructor_id = auth.uid()::text
    )
  );

-- Create simplified INSERT policy for quiz_answers using direct JOIN
CREATE POLICY "quiz_answers_instructors_insert" ON public.quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      JOIN public.lessons l ON l.id = q.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.courses c ON c.id = m.course_id
      WHERE qq.id = quiz_answers.question_id
      AND c.instructor_id = auth.uid()::text
    )
  );
