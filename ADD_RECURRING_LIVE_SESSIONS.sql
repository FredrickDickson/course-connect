-- Add daily recurring live-session support.
-- Run this entire file in the Supabase SQL Editor.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS recurrence_group_id UUID,
  ADD COLUMN IF NOT EXISTS recurrence_day_number INTEGER,
  ADD COLUMN IF NOT EXISTS recurrence_total_days INTEGER;

CREATE INDEX IF NOT EXISTS idx_live_sessions_recurrence_group
  ON public.live_sessions(recurrence_group_id);

ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_recurrence_fields_check;

ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_recurrence_fields_check
  CHECK (
    (recurrence_group_id IS NULL AND recurrence_day_number IS NULL AND recurrence_total_days IS NULL)
    OR
    (recurrence_group_id IS NOT NULL
      AND recurrence_day_number IS NOT NULL
      AND recurrence_total_days IS NOT NULL
      AND recurrence_day_number BETWEEN 1 AND recurrence_total_days
      AND recurrence_total_days BETWEEN 2 AND 365)
  );

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'live_sessions'
  AND column_name IN ('recurrence_group_id', 'recurrence_day_number', 'recurrence_total_days');
