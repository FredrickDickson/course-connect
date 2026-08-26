-- Check the data types of all relevant ID columns
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name IN ('live_sessions', 'assignments', 'course_resources', 'lessons')
  AND column_name IN ('id', 'lesson_id', 'course_id', 'session_id')
ORDER BY table_name, column_name;
