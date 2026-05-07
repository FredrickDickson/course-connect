
-- Remove duplicate quizzes per lesson, keep the most recent
DELETE FROM public.quizzes q
USING public.quizzes q2
WHERE q.lesson_id = q2.lesson_id
  AND q.created_at < q2.created_at;

-- Remove duplicate assignments per lesson, keep the most recent
DELETE FROM public.assignments a
USING public.assignments a2
WHERE a.lesson_id = a2.lesson_id
  AND a.created_at < a2.created_at;

-- Enforce one quiz per lesson
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_lesson_id_unique ON public.quizzes(lesson_id);

-- Enforce one assignment per lesson
CREATE UNIQUE INDEX IF NOT EXISTS assignments_lesson_id_unique ON public.assignments(lesson_id);
