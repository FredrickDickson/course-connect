-- Check if resources were saved and their data
SELECT 
  lr.id,
  lr.name,
  lr.lesson_id,
  lr.file_url,
  lr.resource_type,
  lr.file_size_mb,
  lr.created_at,
  l.title as lesson_title
FROM lesson_resources lr
LEFT JOIN lessons l ON l.id = lr.lesson_id
ORDER BY lr.created_at DESC
LIMIT 20;

-- Check for any resources without proper lesson_id
SELECT 
  id,
  name,
  lesson_id,
  file_url,
  resource_type
FROM lesson_resources
WHERE lesson_id IS NULL OR lesson_id = '';

-- Count resources per lesson
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  COUNT(lr.id) as resource_count
FROM lessons l
LEFT JOIN lesson_resources lr ON lr.lesson_id = l.id
GROUP BY l.id, l.title
HAVING COUNT(lr.id) > 0
ORDER BY COUNT(lr.id) DESC;
