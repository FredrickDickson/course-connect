-- Generalizes assignments/quizzes to be anchored to a lesson (existing curriculum
-- content, unchanged), a live_session (new: in-lecture work), or a course directly
-- (new: standalone work like a "Mock Arbitration" project not tied to any lesson or
-- lecture). Adds a draft/posted workflow so course/session-anchored items start
-- hidden from students until the instructor explicitly posts them; lesson-anchored
-- items are auto-posted at save time to preserve today's behavior exactly.
--
-- lesson_id is already nullable on both tables, so no change needed there. The
-- existing unique indexes quizzes_lesson_id_unique / assignments_lesson_id_unique
-- are plain (non-partial) unique indexes on lesson_id -- Postgres treats multiple
-- NULLs as distinct, so many course/session-anchored rows with lesson_id = NULL
-- coexist fine.

ALTER TABLE public.assignments
  ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN live_session_id uuid REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  ADD COLUMN posted_at timestamp,
  ADD COLUMN group_mode text NOT NULL DEFAULT 'individual' CHECK (group_mode IN ('individual', 'group')),
  ADD COLUMN allow_group_meetings boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT assignments_one_anchor CHECK (num_nonnulls(lesson_id, course_id, live_session_id) = 1);

ALTER TABLE public.quizzes
  ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD COLUMN live_session_id uuid REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  ADD COLUMN posted_at timestamp,
  ADD CONSTRAINT quizzes_one_anchor CHECK (num_nonnulls(lesson_id, course_id, live_session_id) = 1);

-- Existing lesson-anchored content is already visible to enrolled students today;
-- backfill so the new posted_at gate doesn't hide anything that's currently visible.
UPDATE public.assignments SET posted_at = created_at WHERE posted_at IS NULL;
UPDATE public.quizzes SET posted_at = created_at WHERE posted_at IS NULL;

CREATE INDEX idx_assignments_course_id ON public.assignments(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_assignments_live_session_id ON public.assignments(live_session_id) WHERE live_session_id IS NOT NULL;
CREATE INDEX idx_quizzes_course_id ON public.quizzes(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_quizzes_live_session_id ON public.quizzes(live_session_id) WHERE live_session_id IS NOT NULL;

-- ============ OWNERSHIP / VISIBILITY HELPERS ============
-- Mirrors the existing user_owns_lesson/user_owns_module SECURITY DEFINER pattern
-- (20260811190000_admin_bypass_curriculum_ownership_functions.sql).

CREATE OR REPLACE FUNCTION public.user_owns_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = _course_id
      AND (c.instructor_id::text = _user_id::text OR public.is_admin(_user_id::text))
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_live_session(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM live_sessions ls
    WHERE ls.id = _session_id
      AND (ls.instructor_id = _user_id::text OR public.is_admin(_user_id::text))
  );
$$;

-- Resolves the owning course_id regardless of which of the three anchors is set.
-- Used by course-level listing and by the group tables (assignment_groups etc.)
-- added in a later migration to key their RLS off "does this user own the course
-- this assignment ultimately belongs to".
CREATE OR REPLACE FUNCTION public.assignment_course_id(_assignment_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(a.course_id, m.course_id, ls.course_id)
  FROM assignments a
  LEFT JOIN lessons l ON l.id = a.lesson_id
  LEFT JOIN modules m ON m.id = l.module_id
  LEFT JOIN live_sessions ls ON ls.id = a.live_session_id
  WHERE a.id = _assignment_id;
$$;

CREATE OR REPLACE FUNCTION public.quiz_course_id(_quiz_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(q.course_id, m.course_id, ls.course_id)
  FROM quizzes q
  LEFT JOIN lessons l ON l.id = q.lesson_id
  LEFT JOIN modules m ON m.id = l.module_id
  LEFT JOIN live_sessions ls ON ls.id = q.live_session_id
  WHERE q.id = _quiz_id;
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_course(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_live_session(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assignment_course_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_course_id(uuid) TO authenticated;

-- ============ GENERALIZE EXISTING QUIZ READ/OWNERSHIP HELPERS ============
-- user_can_view_quiz / user_can_view_question already gate quiz_questions_select /
-- quiz_answers_select (20260507123534, admin bypass added 20260811230000).
-- user_owns_quiz already gates quiz_questions_instructors_create/update/delete
-- (20260507120740, admin bypass added 20260811190000). CREATE OR REPLACE with the
-- same signatures extends all of those policies to course/session-anchored quizzes
-- with zero policy changes -- exactly the pattern this codebase's own migration
-- history already uses for progressive enhancement. The lesson path is untouched:
-- for a lesson-anchored quiz these resolve identically to before (m.course_id is
-- the only non-null candidate, posted_at is always non-null after the backfill
-- above and going forward is auto-set at save time).

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
    LEFT JOIN lessons l ON l.id = q.lesson_id
    LEFT JOIN modules m ON m.id = l.module_id
    LEFT JOIN live_sessions ls ON ls.id = q.live_session_id
    LEFT JOIN courses c ON c.id = COALESCE(m.course_id, q.course_id, ls.course_id)
    WHERE q.id = _quiz_id
      AND (c.instructor_id::text = _user_id::text OR public.is_admin(_user_id::text))
  );
$$;

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
    LEFT JOIN lessons l ON l.id = q.lesson_id
    LEFT JOIN modules m ON m.id = l.module_id
    LEFT JOIN live_sessions ls ON ls.id = q.live_session_id
    LEFT JOIN courses c ON c.id = COALESCE(m.course_id, q.course_id, ls.course_id)
    WHERE q.id = _quiz_id
      AND (
        c.instructor_id::text = _user_id::text
        OR public.is_admin(_user_id::text)
        OR (
          q.posted_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
        )
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
    LEFT JOIN lessons l ON l.id = q.lesson_id
    LEFT JOIN modules m ON m.id = l.module_id
    LEFT JOIN live_sessions ls ON ls.id = q.live_session_id
    LEFT JOIN courses c ON c.id = COALESCE(m.course_id, q.course_id, ls.course_id)
    WHERE qq.id = _question_id
      AND (
        c.instructor_id::text = _user_id::text
        OR public.is_admin(_user_id::text)
        OR (
          q.posted_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
        )
      )
  );
$$;

-- ============ NEW RLS: COURSE / SESSION ANCHORS ============
-- Additive policies (existing lesson-anchored policies -- assignments_select,
-- quizzes_select, "Instructors and admins can manage assignments/quizzes", etc. --
-- are untouched and simply evaluate false for these rows since lesson_id is NULL).

-- ASSIGNMENTS: course anchor
CREATE POLICY "assignments_course_select" ON public.assignments FOR SELECT TO authenticated USING (
  course_id IS NOT NULL AND (
    public.user_owns_course(course_id, auth.uid())
    OR (
      posted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = assignments.course_id AND e.user_id = auth.uid()::text)
    )
  )
);
CREATE POLICY "assignments_course_manage" ON public.assignments FOR ALL TO authenticated USING (
  course_id IS NOT NULL AND public.user_owns_course(course_id, auth.uid())
) WITH CHECK (
  course_id IS NOT NULL AND public.user_owns_course(course_id, auth.uid())
);

-- ASSIGNMENTS: live session anchor
CREATE POLICY "assignments_session_select" ON public.assignments FOR SELECT TO authenticated USING (
  live_session_id IS NOT NULL AND (
    public.user_owns_live_session(live_session_id, auth.uid())
    OR (
      posted_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM live_sessions ls
        JOIN enrollments e ON e.course_id = ls.course_id
        WHERE ls.id = assignments.live_session_id AND e.user_id = auth.uid()::text
      )
    )
  )
);
CREATE POLICY "assignments_session_manage" ON public.assignments FOR ALL TO authenticated USING (
  live_session_id IS NOT NULL AND public.user_owns_live_session(live_session_id, auth.uid())
) WITH CHECK (
  live_session_id IS NOT NULL AND public.user_owns_live_session(live_session_id, auth.uid())
);

-- QUIZZES: course anchor
CREATE POLICY "quizzes_course_select" ON public.quizzes FOR SELECT TO authenticated USING (
  course_id IS NOT NULL AND (
    public.user_owns_course(course_id, auth.uid())
    OR (
      posted_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = quizzes.course_id AND e.user_id = auth.uid()::text)
    )
  )
);
CREATE POLICY "quizzes_course_manage" ON public.quizzes FOR ALL TO authenticated USING (
  course_id IS NOT NULL AND public.user_owns_course(course_id, auth.uid())
) WITH CHECK (
  course_id IS NOT NULL AND public.user_owns_course(course_id, auth.uid())
);

-- QUIZZES: live session anchor
CREATE POLICY "quizzes_session_select" ON public.quizzes FOR SELECT TO authenticated USING (
  live_session_id IS NOT NULL AND (
    public.user_owns_live_session(live_session_id, auth.uid())
    OR (
      posted_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM live_sessions ls
        JOIN enrollments e ON e.course_id = ls.course_id
        WHERE ls.id = quizzes.live_session_id AND e.user_id = auth.uid()::text
      )
    )
  )
);
CREATE POLICY "quizzes_session_manage" ON public.quizzes FOR ALL TO authenticated USING (
  live_session_id IS NOT NULL AND public.user_owns_live_session(live_session_id, auth.uid())
) WITH CHECK (
  live_session_id IS NOT NULL AND public.user_owns_live_session(live_session_id, auth.uid())
);

-- ============ COURSE-SCOPED LISTING VIEWS ============
-- Lets a course page list assignments/quizzes regardless of which anchor was used.
-- security_invoker means the underlying assignments/quizzes RLS (as this querying
-- user) is what actually gates rows -- the view adds no privilege of its own.

CREATE OR REPLACE VIEW public.course_assignments WITH (security_invoker = true) AS
SELECT
  a.*,
  COALESCE(a.course_id, m.course_id, ls.course_id) AS resolved_course_id,
  CASE
    WHEN a.lesson_id IS NOT NULL THEN 'lesson'
    WHEN a.live_session_id IS NOT NULL THEN 'session'
    ELSE 'course'
  END AS anchor_type
FROM public.assignments a
LEFT JOIN public.lessons l ON l.id = a.lesson_id
LEFT JOIN public.modules m ON m.id = l.module_id
LEFT JOIN public.live_sessions ls ON ls.id = a.live_session_id;

CREATE OR REPLACE VIEW public.course_quizzes WITH (security_invoker = true) AS
SELECT
  q.*,
  COALESCE(q.course_id, m.course_id, ls.course_id) AS resolved_course_id,
  CASE
    WHEN q.lesson_id IS NOT NULL THEN 'lesson'
    WHEN q.live_session_id IS NOT NULL THEN 'session'
    ELSE 'course'
  END AS anchor_type
FROM public.quizzes q
LEFT JOIN public.lessons l ON l.id = q.lesson_id
LEFT JOIN public.modules m ON m.id = l.module_id
LEFT JOIN public.live_sessions ls ON ls.id = q.live_session_id;

GRANT SELECT ON public.course_assignments TO authenticated;
GRANT SELECT ON public.course_quizzes TO authenticated;

-- ============ COURSE/SESSION QUIZ CREATE + UPDATE RPCS ============
-- Mirror upsert_quiz's transactional pattern (20260811210000_add_upsert_quiz_rpc.sql)
-- for the two new anchors. upsert_quiz itself is untouched and keeps serving the
-- lesson path unchanged. Unlike upsert_quiz's delete-and-recreate-the-quiz-row
-- approach, update_anchored_quiz preserves the quizzes row itself (id, posted_at)
-- and only replaces its questions/answers, so editing a course/session quiz after
-- students have posted_at-visible access to it doesn't silently swap its identity
-- out from under an in-progress quiz_attempts row.

CREATE OR REPLACE FUNCTION public.create_anchored_quiz(
  _anchor_type text,
  _anchor_id uuid,
  _title text,
  _description text,
  _time_limit_minutes integer,
  _passing_score integer,
  _max_attempts integer,
  _questions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz_id uuid;
  v_question jsonb;
  v_answer jsonb;
  v_question_id uuid;
  v_q_order integer := 0;
  v_a_order integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _anchor_type NOT IN ('course', 'session') THEN
    RAISE EXCEPTION 'Invalid anchor_type: %', _anchor_type USING ERRCODE = '22023';
  END IF;

  IF _anchor_type = 'course' AND NOT public.user_owns_course(_anchor_id, v_uid) THEN
    RAISE EXCEPTION 'You do not own this course' USING ERRCODE = '42501';
  END IF;
  IF _anchor_type = 'session' AND NOT public.user_owns_live_session(_anchor_id, v_uid) THEN
    RAISE EXCEPTION 'You do not own this live session' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.quizzes (course_id, live_session_id, title, description, time_limit_minutes, passing_score, max_attempts)
  VALUES (
    CASE WHEN _anchor_type = 'course' THEN _anchor_id END,
    CASE WHEN _anchor_type = 'session' THEN _anchor_id END,
    _title, _description, _time_limit_minutes, _passing_score, _max_attempts
  )
  RETURNING id INTO v_quiz_id;

  FOR v_question IN SELECT * FROM jsonb_array_elements(COALESCE(_questions, '[]'::jsonb))
  LOOP
    INSERT INTO public.quiz_questions (quiz_id, question, question_type, points, "order")
    VALUES (
      v_quiz_id,
      v_question->>'question',
      COALESCE(v_question->>'questionType', 'multiple_choice'),
      COALESCE((v_question->>'points')::integer, 1),
      v_q_order
    )
    RETURNING id INTO v_question_id;

    IF v_question->>'questionType' = 'fill_blank' THEN
      IF COALESCE(v_question->>'correctAnswer', '') <> '' THEN
        INSERT INTO public.quiz_answers (question_id, answer, is_correct, "order")
        VALUES (v_question_id, v_question->>'correctAnswer', true, 0);
      END IF;
    ELSE
      v_a_order := 0;
      FOR v_answer IN SELECT * FROM jsonb_array_elements(COALESCE(v_question->'answers', '[]'::jsonb))
      LOOP
        INSERT INTO public.quiz_answers (question_id, answer, is_correct, "order")
        VALUES (
          v_question_id,
          v_answer->>'answer',
          COALESCE((v_answer->>'isCorrect')::boolean, false),
          v_a_order
        );
        v_a_order := v_a_order + 1;
      END LOOP;
    END IF;

    v_q_order := v_q_order + 1;
  END LOOP;

  RETURN v_quiz_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_anchored_quiz(
  _quiz_id uuid,
  _title text,
  _description text,
  _time_limit_minutes integer,
  _passing_score integer,
  _max_attempts integer,
  _questions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_question jsonb;
  v_answer jsonb;
  v_question_id uuid;
  v_q_order integer := 0;
  v_a_order integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.user_owns_quiz(_quiz_id, v_uid) THEN
    RAISE EXCEPTION 'You do not own this quiz' USING ERRCODE = '42501';
  END IF;

  UPDATE public.quizzes
  SET title = _title,
      description = _description,
      time_limit_minutes = _time_limit_minutes,
      passing_score = _passing_score,
      max_attempts = _max_attempts
  WHERE id = _quiz_id;

  DELETE FROM public.quiz_questions WHERE quiz_id = _quiz_id;

  FOR v_question IN SELECT * FROM jsonb_array_elements(COALESCE(_questions, '[]'::jsonb))
  LOOP
    INSERT INTO public.quiz_questions (quiz_id, question, question_type, points, "order")
    VALUES (
      _quiz_id,
      v_question->>'question',
      COALESCE(v_question->>'questionType', 'multiple_choice'),
      COALESCE((v_question->>'points')::integer, 1),
      v_q_order
    )
    RETURNING id INTO v_question_id;

    IF v_question->>'questionType' = 'fill_blank' THEN
      IF COALESCE(v_question->>'correctAnswer', '') <> '' THEN
        INSERT INTO public.quiz_answers (question_id, answer, is_correct, "order")
        VALUES (v_question_id, v_question->>'correctAnswer', true, 0);
      END IF;
    ELSE
      v_a_order := 0;
      FOR v_answer IN SELECT * FROM jsonb_array_elements(COALESCE(v_question->'answers', '[]'::jsonb))
      LOOP
        INSERT INTO public.quiz_answers (question_id, answer, is_correct, "order")
        VALUES (
          v_question_id,
          v_answer->>'answer',
          COALESCE((v_answer->>'isCorrect')::boolean, false),
          v_a_order
        );
        v_a_order := v_a_order + 1;
      END LOOP;
    END IF;

    v_q_order := v_q_order + 1;
  END LOOP;

  RETURN _quiz_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_anchored_quiz(text, uuid, text, text, integer, integer, integer, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_anchored_quiz(text, uuid, text, text, integer, integer, integer, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_anchored_quiz(uuid, text, text, integer, integer, integer, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_anchored_quiz(uuid, text, text, integer, integer, integer, jsonb) TO authenticated;
