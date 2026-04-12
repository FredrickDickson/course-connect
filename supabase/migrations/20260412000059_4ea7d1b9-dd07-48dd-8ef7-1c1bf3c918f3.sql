
-- Enable RLS on course_resources (was missing)
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course resources"
  ON public.course_resources FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage course resources"
  ON public.course_resources FOR ALL
  TO authenticated
  USING (is_admin((auth.uid())::text));

CREATE POLICY "Instructors can manage their course resources"
  ON public.course_resources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_resources.course_id
        AND (courses.instructor_id)::text = (auth.uid())::text
    )
  );
