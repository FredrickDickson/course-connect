
-- Helper: can the user view a lesson (instructor of course OR enrolled OR course is published)
CREATE OR REPLACE FUNCTION public.user_can_view_lesson(_lesson_id uuid, _user_id uuid)
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
      AND (
        c.instructor_id::text = _user_id::text
        OR c.is_published = true
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
      )
  );
$$;

-- Helper: can the user view a quiz
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
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
      )
  );
$$;

-- Helper: can the user view a quiz question
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
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
      )
  );
$$;

-- Helper: does user own the module's course (instructor)
CREATE OR REPLACE FUNCTION public.user_owns_module(_module_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE m.id = _module_id
      AND c.instructor_id::text = _user_id::text
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_view_lesson(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_can_view_quiz(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_can_view_question(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_module(uuid, uuid) TO authenticated, anon;

-- ============ LESSONS ============
DROP POLICY IF EXISTS "Instructors can manage lessons of their modules" ON public.lessons;
DROP POLICY IF EXISTS "Lessons are viewable if course is viewable" ON public.lessons;
DROP POLICY IF EXISTS "lessons_instructors_create" ON public.lessons;
DROP POLICY IF EXISTS "lessons_instructors_delete" ON public.lessons;
DROP POLICY IF EXISTS "lessons_instructors_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_instructors_view_own" ON public.lessons;
DROP POLICY IF EXISTS "lessons_view_from_published_courses" ON public.lessons;

CREATE POLICY "lessons_select" ON public.lessons
  FOR SELECT TO authenticated
  USING (public.user_can_view_lesson(id, auth.uid()));

CREATE POLICY "lessons_insert" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_module(module_id, auth.uid()));

CREATE POLICY "lessons_update" ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.user_owns_module(module_id, auth.uid()))
  WITH CHECK (public.user_owns_module(module_id, auth.uid()));

CREATE POLICY "lessons_delete" ON public.lessons
  FOR DELETE TO authenticated
  USING (public.user_owns_module(module_id, auth.uid()));

-- ============ QUIZZES ============
DROP POLICY IF EXISTS "Quizzes are viewable if lesson is viewable" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_instructors_view" ON public.quizzes;
DROP POLICY IF EXISTS "quizzes_view_enrolled" ON public.quizzes;

CREATE POLICY "quizzes_select" ON public.quizzes
  FOR SELECT TO authenticated
  USING (public.user_can_view_lesson(lesson_id, auth.uid()));

-- ============ QUIZ QUESTIONS ============
DROP POLICY IF EXISTS "quiz_questions_view" ON public.quiz_questions;

CREATE POLICY "quiz_questions_select" ON public.quiz_questions
  FOR SELECT TO authenticated
  USING (public.user_can_view_quiz(quiz_id, auth.uid()));

-- ============ QUIZ ANSWERS ============
DROP POLICY IF EXISTS "quiz_answers_view" ON public.quiz_answers;

CREATE POLICY "quiz_answers_select" ON public.quiz_answers
  FOR SELECT TO authenticated
  USING (public.user_can_view_question(question_id, auth.uid()));

-- ============ ASSIGNMENTS ============
DROP POLICY IF EXISTS "Assignments are viewable if lesson is viewable" ON public.assignments;
DROP POLICY IF EXISTS "assignments_instructors_view" ON public.assignments;
DROP POLICY IF EXISTS "assignments_instructors_create" ON public.assignments;
DROP POLICY IF EXISTS "assignments_view_enrolled" ON public.assignments;

CREATE POLICY "assignments_select" ON public.assignments
  FOR SELECT TO authenticated
  USING (public.user_can_view_lesson(lesson_id, auth.uid()));

CREATE POLICY "assignments_insert" ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()));

CREATE POLICY "assignments_update" ON public.assignments
  FOR UPDATE TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()))
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()));

CREATE POLICY "assignments_delete" ON public.assignments
  FOR DELETE TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()));

-- Add missing index on enrollments.course_id for the helper lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
