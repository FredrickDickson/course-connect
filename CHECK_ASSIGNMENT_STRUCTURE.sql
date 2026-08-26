-- Check the actual structure of assignments table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'assignments'
ORDER BY 
    ordinal_position;

-- Check for any group-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%group%';

-- Check assignment_submissions structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'assignment_submissions'
ORDER BY 
    ordinal_position;
