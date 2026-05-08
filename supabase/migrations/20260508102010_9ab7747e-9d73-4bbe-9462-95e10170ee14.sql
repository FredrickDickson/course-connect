-- Safety: remove duplicates (table currently empty, but guard regardless)
DELETE FROM public.progress p
USING public.progress p2
WHERE p.ctid < p2.ctid
  AND p.user_id = p2.user_id
  AND p.lesson_id = p2.lesson_id;

ALTER TABLE public.progress
  ADD CONSTRAINT progress_user_lesson_unique UNIQUE (user_id, lesson_id);