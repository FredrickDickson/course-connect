
-- 1. Allow authenticated/anon to execute is_admin (used in profiles SELECT policy)
GRANT EXECUTE ON FUNCTION public.is_admin(text) TO authenticated, anon;

-- 2. Helper: does the current user instruct the course that owns this lesson?
CREATE OR REPLACE FUNCTION public.user_owns_lesson(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE l.id = _lesson_id
      AND c.instructor_id::text = _user_id::text
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_quiz(_quiz_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM quizzes q
    JOIN lessons l ON l.id = q.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE q.id = _quiz_id
      AND c.instructor_id::text = _user_id::text
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_question(_question_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    JOIN lessons l ON l.id = q.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE qq.id = _question_id
      AND c.instructor_id::text = _user_id::text
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_lesson(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_quiz(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_question(uuid, uuid) TO authenticated;

-- 3. Replace slow recursive policies on quizzes
DROP POLICY IF EXISTS quizzes_instructors_create ON public.quizzes;
DROP POLICY IF EXISTS quizzes_instructors_update ON public.quizzes;
DROP POLICY IF EXISTS quizzes_instructors_view ON public.quizzes;
DROP POLICY IF EXISTS quizzes_instructors_delete ON public.quizzes;

CREATE POLICY quizzes_instructors_create ON public.quizzes
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()));

CREATE POLICY quizzes_instructors_update ON public.quizzes
  FOR UPDATE TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()))
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()));

CREATE POLICY quizzes_instructors_view ON public.quizzes
  FOR SELECT TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()));

CREATE POLICY quizzes_instructors_delete ON public.quizzes
  FOR DELETE TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()));

-- 4. Replace policies on quiz_questions
DROP POLICY IF EXISTS quiz_questions_instructors_create ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_instructors_update ON public.quiz_questions;
DROP POLICY IF EXISTS quiz_questions_instructors_delete ON public.quiz_questions;

CREATE POLICY quiz_questions_instructors_create ON public.quiz_questions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_quiz(quiz_id, auth.uid()));

CREATE POLICY quiz_questions_instructors_update ON public.quiz_questions
  FOR UPDATE TO authenticated
  USING (public.user_owns_quiz(quiz_id, auth.uid()))
  WITH CHECK (public.user_owns_quiz(quiz_id, auth.uid()));

CREATE POLICY quiz_questions_instructors_delete ON public.quiz_questions
  FOR DELETE TO authenticated
  USING (public.user_owns_quiz(quiz_id, auth.uid()));

-- 5. Replace policies on quiz_answers
DROP POLICY IF EXISTS quiz_answers_instructors_create ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_answers_instructors_update ON public.quiz_answers;
DROP POLICY IF EXISTS quiz_answers_instructors_delete ON public.quiz_answers;

CREATE POLICY quiz_answers_instructors_create ON public.quiz_answers
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_question(question_id, auth.uid()));

CREATE POLICY quiz_answers_instructors_update ON public.quiz_answers
  FOR UPDATE TO authenticated
  USING (public.user_owns_question(question_id, auth.uid()))
  WITH CHECK (public.user_owns_question(question_id, auth.uid()));

CREATE POLICY quiz_answers_instructors_delete ON public.quiz_answers
  FOR DELETE TO authenticated
  USING (public.user_owns_question(question_id, auth.uid()));
