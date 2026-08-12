-- upsertQuiz (client/src/lib/curriculum-mutations.ts) previously did delete-existing
-- + insert-quiz + insert-questions + insert-answers as four separate, non-transactional
-- Supabase calls. Any failure partway through (RLS denial, network drop, bad row) left a
-- broken partial quiz permanently in the DB instead of rolling back -- exactly the class
-- of bug this project's quiz RLS migration history (20260507*) shows has bitten this
-- feature before. Wrapping the whole sequence in a single SECURITY DEFINER function makes
-- it one transaction: either the whole quiz saves, or nothing does.

CREATE OR REPLACE FUNCTION public.upsert_quiz(
  _lesson_id uuid,
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

  IF NOT public.user_owns_lesson(_lesson_id, v_uid) THEN
    RAISE EXCEPTION 'You do not own this lesson' USING ERRCODE = '42501';
  END IF;

  -- Replaces any existing quiz for this lesson (FK cascade removes its questions/answers)
  DELETE FROM public.quizzes WHERE lesson_id = _lesson_id;

  INSERT INTO public.quizzes (lesson_id, title, description, time_limit_minutes, passing_score, max_attempts)
  VALUES (_lesson_id, _title, _description, _time_limit_minutes, _passing_score, _max_attempts)
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

REVOKE EXECUTE ON FUNCTION public.upsert_quiz(uuid, text, text, integer, integer, integer, jsonb) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_quiz(uuid, text, text, integer, integer, integer, jsonb) TO authenticated;
