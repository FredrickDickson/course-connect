-- Check the data type of users.id column
SELECT 
    column_name, 
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'id';
