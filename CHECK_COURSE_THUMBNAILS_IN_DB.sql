-- Check if courses have thumbnail URLs in the database
-- This will show us if the URLs are being saved or not

SELECT 
  id,
  title,
  thumbnail_url,
  created_at,
  created_by_admin_id
FROM courses
ORDER BY created_at DESC
LIMIT 10;

-- Check specifically for courses created by admin with NULL thumbnails
SELECT 
  COUNT(*) as total_courses,
  COUNT(thumbnail_url) as courses_with_thumbnails,
  COUNT(*) - COUNT(thumbnail_url) as courses_without_thumbnails
FROM courses
WHERE created_by_admin_id IS NOT NULL;

-- Show recent courses without thumbnails
SELECT 
  id,
  title,
  created_at,
  instructor_id
FROM courses
WHERE thumbnail_url IS NULL
  AND created_by_admin_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
