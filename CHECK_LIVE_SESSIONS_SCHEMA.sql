-- Check the complete schema of live_sessions table including all columns and constraints

-- 1. Get all columns
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'live_sessions'
ORDER BY ordinal_position;

-- 2. Get ALL constraints with full details
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'live_sessions'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Look for the specific constraint mentioned in error
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.live_sessions'::regclass
  AND conname LIKE '%duration%';

-- 4. Try alternative schema name
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'live_sessions'::regclass
  AND conname LIKE '%max%';
