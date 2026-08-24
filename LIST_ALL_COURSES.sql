-- List all available courses with details

SELECT 
    c.id,
    c.title,
    c.description,
    c.price,
    c.is_published,
    c.category,
    c.level,
    c.duration_weeks,
    c.created_at,
    i.first_name || ' ' || i.last_name AS instructor_name,
    i.email AS instructor_email,
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
    (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) AS module_count
FROM courses c
LEFT JOIN users i ON c.instructor_id = i.id
ORDER BY c.created_at DESC;

-- To see only published courses:
-- WHERE c.is_published = true
