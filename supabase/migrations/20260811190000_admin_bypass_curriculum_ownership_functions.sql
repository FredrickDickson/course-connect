-- 20260811170000_fix_create_lesson_authorization.sql brought create_lesson's
-- own ownership check up to date with admin support, but the shared RLS
-- helper functions used by lessons/quizzes/quiz_questions/quiz_answers/
-- assignments policies were never updated to match. Admins (role='admin' in
-- public.users) could create a lesson via the RPC, but could not update or
-- delete it, and could not create/edit quizzes, quiz questions, quiz
-- answers, or assignments on a course they don't personally own via
-- courses.instructor_id -- surfacing as 403s on e.g. POST /rest/v1/quizzes
-- and user_owns_module() returning false in client debug logging, exactly
-- like the bug create_lesson was fixed for. user_can_view_lesson and the
-- modules table's "Instructors and admins can manage modules" policy
-- already carry this same admin OR-clause; this migration brings the write
-- side ownership functions in line with that existing pattern.

CREATE OR REPLACE FUNCTION public.user_owns_module(_module_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM modules m
    JOIN courses c ON c.id = m.course_id
    WHERE m.id = _module_id
      AND (c.instructor_id::text = _user_id::text OR public.is_admin(_user_id::text))
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_owns_lesson(_lesson_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE l.id = _lesson_id
      AND (c.instructor_id::text = _user_id::text OR public.is_admin(_user_id::text))
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_owns_quiz(_quiz_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM quizzes q
    JOIN lessons l ON l.id = q.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE q.id = _quiz_id
      AND (c.instructor_id::text = _user_id::text OR public.is_admin(_user_id::text))
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_owns_question(_question_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    JOIN lessons l ON l.id = q.lesson_id
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE qq.id = _question_id
      AND (c.instructor_id::text = _user_id::text OR public.is_admin(_user_id::text))
  );
$function$;
