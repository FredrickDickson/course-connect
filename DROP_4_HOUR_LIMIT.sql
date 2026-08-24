-- Remove the 4-hour (240 minute) duration limit from live_sessions table
-- This constraint was: EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60 <= 240

-- Drop the constraint
ALTER TABLE public.live_sessions 
DROP CONSTRAINT IF EXISTS valid_max_duration;

-- Verify it's removed
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.live_sessions'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Test: This should show remaining check constraints only
-- Expected result: valid_max_duration should NOT appear
