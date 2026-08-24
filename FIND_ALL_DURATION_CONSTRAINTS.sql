-- Find ALL constraints on live_sessions table, including duration-related ones

-- 1. Check ALL constraints (including hidden ones)
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition,
    convalidated AS is_validated
FROM pg_constraint
WHERE conrelid = 'live_sessions'::regclass
ORDER BY conname;

-- 2. Specifically search for anything with 'duration' in the constraint definition
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'live_sessions'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%duration%';

-- 3. Check the table definition to see if there's a column check
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'live_sessions'
  AND column_name LIKE '%duration%';

-- 4. Try to drop the constraint (will fail silently if it doesn't exist)
ALTER TABLE live_sessions 
DROP CONSTRAINT IF EXISTS valid_max_duration CASCADE;

-- 5. Also try these possible names
ALTER TABLE live_sessions 
DROP CONSTRAINT IF EXISTS check_max_duration CASCADE;

ALTER TABLE live_sessions 
DROP CONSTRAINT IF EXISTS live_sessions_duration_check CASCADE;

ALTER TABLE live_sessions 
DROP CONSTRAINT IF EXISTS max_duration_check CASCADE;

-- 6. Verify all constraints again after dropping
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'live_sessions'::regclass
  AND contype = 'c'
ORDER BY conname;
