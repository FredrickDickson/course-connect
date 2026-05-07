-- Optimize quiz RLS policies by adding indexes and simplifying policies

-- Add indexes to improve JOIN performance in RLS policies
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON public.quiz_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);

-- Drop existing inefficient RLS policies
DROP POLICY IF EXISTS "quiz_questions_instructors_update" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_instructors_delete" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_answers_instructors_update" ON public.quiz_answers;
DROP POLICY IF EXISTS "quiz_answers_instructors_delete" ON public.quiz_answers;

-- Create optimized RLS policies using direct foreign key checks
CREATE POLICY "quiz_questions_instructors_update" ON public.quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.lessons ON lessons.id = quizzes.lesson_id
      JOIN public.modules ON modules.id = lessons.module_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND modules.course_id IN (
        SELECT id FROM public.courses WHERE instructor_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "quiz_questions_instructors_delete" ON public.quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      JOIN public.lessons ON lessons.id = quizzes.lesson_id
      JOIN public.modules ON modules.id = lessons.module_id
      WHERE quizzes.id = quiz_questions.quiz_id
      AND modules.course_id IN (
        SELECT id FROM public.courses WHERE instructor_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "quiz_answers_instructors_update" ON public.quiz_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions
      JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
      JOIN public.lessons ON lessons.id = quizzes.lesson_id
      JOIN public.modules ON modules.id = lessons.module_id
      WHERE quiz_questions.id = quiz_answers.question_id
      AND modules.course_id IN (
        SELECT id FROM public.courses WHERE instructor_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "quiz_answers_instructors_delete" ON public.quiz_answers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_questions
      JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id
      JOIN public.lessons ON lessons.id = quizzes.lesson_id
      JOIN public.modules ON modules.id = lessons.module_id
      WHERE quiz_questions.id = quiz_answers.question_id
      AND modules.course_id IN (
        SELECT id FROM public.courses WHERE instructor_id = auth.uid()::text
      )
    )
  );
