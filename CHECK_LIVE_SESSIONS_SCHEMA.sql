-- Check if live_sessions table exists and has required fields
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'live_sessions'
  AND column_name IN ('id', 'course_id', 'is_public', 'instructor_id', 'title', 'status')
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'live_sessions'
) as table_exists;

-- If table exists, check sample data structure
SELECT 
    id, 
    title, 
    course_id, 
    is_public, 
    instructor_id,
    status,
    created_at
FROM live_sessions 
LIMIT 1;
