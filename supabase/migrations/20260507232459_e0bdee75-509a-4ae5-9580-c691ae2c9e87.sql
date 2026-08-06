-- 1) Allow public read of instructor profile rows so avatar_url is visible to everyone
CREATE POLICY "Public can view instructor profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = profiles.user_id
      AND u.role = 'instructor'
  )
);

-- 2) Allow public read of lessons that belong to published courses
CREATE POLICY "Lessons of published courses are viewable by everyone"
ON public.lessons
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id
      AND c.is_published = true
  )
);