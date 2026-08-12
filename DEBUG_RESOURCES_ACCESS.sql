-- Debug: Check why resources aren't visible
-- Run this while logged in as the user who can't see resources

-- 1. Check your current user info
SELECT 
  auth.uid() as my_user_id,
  (SELECT role FROM users WHERE id = auth.uid()::text) as my_role,
  (SELECT role FROM users WHERE id = auth.uid()::text) = 'admin' as am_i_admin;

-- 2. Check the lesson and course details
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  c.id as course_id,
  c.title as course_title,
  c.instructor_id,
  c.is_published,
  (c.instructor_id::text = auth.uid()::text) as am_i_instructor,
  EXISTS(SELECT 1 FROM enrollments WHERE course_id = c.id AND user_id::text = auth.uid()::text) as am_i_enrolled
FROM lessons l
JOIN modules m ON m.id = l.module_id
JOIN courses c ON c.id = m.course_id
WHERE l.id = '45469db8-e0d0-42a2-b664-00bc72b76ca1';

-- 3. Test if user_can_view_lesson returns true
SELECT 
  public.user_can_view_lesson('45469db8-e0d0-42a2-b664-00bc72b76ca1'::uuid, auth.uid()) as can_view_lesson;

-- 4. Check resources for this lesson
SELECT 
  id,
  name,
  lesson_id,
  resource_type,
  created_at
FROM lesson_resources
WHERE lesson_id = '45469db8-e0d0-42a2-b664-00bc72b76ca1';
