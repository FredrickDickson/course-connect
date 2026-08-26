-- Fix session-only assignments rejected by the old anchor constraint
-- Run this entire file in the Supabase SQL Editor.

ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_one_anchor;

ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS assignments_parent_check;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_parent_check
  CHECK (
    (lesson_id IS NOT NULL AND session_id IS NULL) OR
    (lesson_id IS NULL AND session_id IS NOT NULL)
  );

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.assignments'::regclass
  AND conname IN ('assignments_one_anchor', 'assignments_parent_check');
