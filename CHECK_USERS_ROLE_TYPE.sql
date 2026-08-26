-- Check the actual data type of the role column in users table
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'role';
