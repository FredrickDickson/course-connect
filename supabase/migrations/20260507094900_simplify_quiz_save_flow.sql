-- Simplify quiz save flow by removing DELETE RLS policies and using CASCADE

-- Remove DELETE RLS policies that are causing timeouts
DROP POLICY IF EXISTS "quiz_questions_instructors_delete" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_answers_instructors_delete" ON public.quiz_answers;
DROP POLICY IF EXISTS "quizzes_instructors_delete" ON public.quizzes;

-- Add CASCADE delete to quiz_questions so deleting quiz deletes questions automatically
-- This avoids needing application-level DELETE operations
ALTER TABLE public.quiz_questions
DROP CONSTRAINT IF EXISTS quiz_questions_quiz_id_fkey,
ADD CONSTRAINT quiz_questions_quiz_id_fkey
  FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Add CASCADE delete to quiz_answers so deleting questions deletes answers automatically
ALTER TABLE public.quiz_answers
DROP CONSTRAINT IF EXISTS quiz_answers_question_id_fkey,
ADD CONSTRAINT quiz_answers_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;

-- Simplify INSERT RLS policies to be more efficient
DROP POLICY IF EXISTS "quiz_questions_instructors_insert" ON public.quiz_questions;
CREATE POLICY "quiz_questions_instructors_insert" ON public.quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.lesson_id IN (
        SELECT id FROM public.lessons WHERE module_id IN (
          SELECT id FROM public.modules WHERE course_id IN (
            SELECT id FROM public.courses WHERE instructor_id = auth.uid()::text
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "quiz_answers_instructors_insert" ON public.quiz_answers;
CREATE POLICY "quiz_answers_instructors_insert" ON public.quiz_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_questions
      WHERE quiz_questions.id = quiz_answers.question_id
      AND quiz_questions.quiz_id IN (
        SELECT id FROM public.quizzes WHERE lesson_id IN (
          SELECT id FROM public.lessons WHERE module_id IN (
            SELECT id FROM public.modules WHERE course_id IN (
              SELECT id FROM public.courses WHERE instructor_id = auth.uid()::text
            )
          )
        )
      )
    )
  );
