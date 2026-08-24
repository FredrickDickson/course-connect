-- Remove the duration constraint from live_sessions table
-- This allows sessions of unlimited duration

-- Drop the check constraint that limits session duration
ALTER TABLE live_sessions 
DROP CONSTRAINT IF EXISTS valid_max_duration;

-- Verify the constraint has been removed
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'live_sessions'::regclass
  AND contype = 'c'  -- 'c' = check constraint
ORDER BY conname;

-- Expected: The valid_max_duration constraint should NOT appear in the results
