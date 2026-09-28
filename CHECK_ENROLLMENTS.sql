-- ============================================
-- CHECK ENROLLMENTS: View all enrollments by course
-- ============================================

-- 1. Count enrollments per course
SELECT 
  c.id as course_id,
  c.title as course_name,
  COUNT(DISTINCT e.id) as enrollment_count,
  COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_enrollments,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_payments,
  COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_payments
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN orders o ON c.id = o.course_id AND o.status = 'completed'
GROUP BY c.id, c.title
ORDER BY enrollment_count DESC;

-- 2. Detailed enrollment list for a specific course
-- Replace 'COURSE_ID_HERE' with actual course ID
/*
SELECT 
  e.id as enrollment_id,
  e.user_id,
  u.email,
  p.full_name,
  e.status as enrollment_status,
  e.enrolled_at,
  o.booking_ref,
  o.status as payment_status,
  o.amount
FROM enrollments e
LEFT JOIN users u ON e.user_id = u.id
LEFT JOIN profiles p ON e.user_id = p.user_id
LEFT JOIN orders o ON e.course_id = o.course_id AND e.user_id = o.user_id
WHERE e.course_id = 'COURSE_ID_HERE'
ORDER BY e.enrolled_at DESC;
*/

-- 3. Check if there are any enrollments at all
SELECT 
  'enrollments' as table_name,
  COUNT(*) as total_count
FROM enrollments
UNION ALL
SELECT 
  'orders',
  COUNT(*)
FROM orders
WHERE status = 'completed';

-- 4. Recent enrollments (last 20)
SELECT 
  e.id,
  c.title as course_name,
  u.email,
  p.full_name,
  e.status,
  e.enrolled_at,
  o.booking_ref
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN users u ON e.user_id = u.id
LEFT JOIN profiles p ON e.user_id = p.user_id
LEFT JOIN orders o ON e.course_id = o.course_id AND e.user_id = o.user_id
ORDER BY e.enrolled_at DESC
LIMIT 20;

-- 5. Courses with their enrollment counts (for debugging)
SELECT 
  c.id,
  c.title,
  c.is_published,
  (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrollment_count,
  (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as active_count
FROM courses c
ORDER BY c.created_at DESC
LIMIT 10;
