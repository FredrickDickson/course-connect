-- Fix: Update user_can_view_lesson to also check for admin users
-- This will allow admins to see lesson resources

CREATE OR REPLACE FUNCTION public.user_can_view_lesson(_lesson_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    JOIN courses c ON c.id = m.course_id
    WHERE l.id = _lesson_id
      AND (
        c.instructor_id::text = _user_id::text
        OR c.is_published = true
        OR EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id::text = _user_id::text)
        OR public.is_admin(_user_id::text)  -- Added admin check
      )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_can_view_lesson(uuid, uuid) TO authenticated, anon;
