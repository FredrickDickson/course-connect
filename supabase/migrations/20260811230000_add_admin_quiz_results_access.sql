-- Admin dashboard needs a platform-wide quiz results view, but quiz_attempts and
-- quiz_responses have no admin bypass at all (only "view own" for the student and
-- "view" scoped to courses.instructor_id for the instructor). Mirror the standard
-- is_admin() SELECT-policy pattern already used for enrollments/orders/users.

CREATE POLICY "Admins can view all quiz attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (is_admin((auth.uid())::text));

CREATE POLICY "Admins can view all quiz responses"
ON public.quiz_responses
FOR SELECT
TO authenticated
USING (is_admin((auth.uid())::text));

-- quiz_questions_select / quiz_answers_select route through user_can_view_quiz() /
-- user_can_view_question(), which (unlike user_owns_quiz()/user_owns_question(), fixed
-- in 20260811190000_admin_bypass_curriculum_ownership_functions.sql) were never given an
-- admin bypass. Without this, the results view can show attempts/scores but not the
-- question text or answer options for a course the admin doesn't own. Bring these two
-- read-side helpers in line with the same OR is_admin(...) pattern.

CREATE OR REPLACE FUNCTION public.user_can_view_quiz(_quiz_id uuid, _user_id uuid)
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
      AND (
        c.instructor_id::text = _user_id::text
        OR public.is_admin(_user_id::text)
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_question(_question_id uuid, _user_id uuid)
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
      AND (
        c.instructor_id::text = _user_id::text
        OR public.is_admin(_user_id::text)
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
      )
  );
$$;
