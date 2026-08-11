-- Simple debug query - run this while logged in as the user who can't see resources

SELECT 
  -- Your identity
  auth.uid() as my_user_id,
  (SELECT role FROM users WHERE id = auth.uid()::text) as my_role,
  
  -- Lesson/Course info
  l.id as lesson_id,
  l.title as lesson_title,
  c.id as course_id,
  c.title as course_title,
  c.instructor_id,
  c.is_published,
  
  -- Access checks
  (c.instructor_id::text = auth.uid()::text) as am_i_instructor,
  EXISTS(SELECT 1 FROM enrollments WHERE course_id = c.id AND user_id::text = auth.uid()::text) as am_i_enrolled,
  public.user_can_view_lesson(l.id, auth.uid()) as can_view_lesson_returns,
  
  -- Resource count
  (SELECT COUNT(*) FROM lesson_resources WHERE lesson_id = l.id) as resource_count

FROM lessons l
JOIN modules m ON m.id = l.module_id
JOIN courses c ON c.id = m.course_id
WHERE l.id = '45469db8-e0d0-42a2-b664-00bc72b76ca1';
