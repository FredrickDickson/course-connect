-- Run this first to get the course ID
SELECT 
    id, 
    title, 
    price,
    currency,
    is_published
FROM courses
WHERE is_published = true
ORDER BY created_at DESC;
