-- Add "Presentation" lecture content type (PDF slideshow viewer)
-- lessons.content_type has no CHECK constraint, so 'presentation' needs no change there.

CREATE TABLE public.presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type varchar(10) NOT NULL DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'pptx')),
  page_count integer,
  allow_download boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE INDEX idx_presentations_lesson_id ON public.presentations(lesson_id);

ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

-- RLS: reuse the existing helper functions (user_can_view_lesson / user_owns_lesson)
-- and bake in is_admin from the start instead of needing a follow-up "fix admin access" migration.
CREATE POLICY "presentations_select" ON public.presentations
  FOR SELECT TO authenticated
  USING (public.user_can_view_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text));

CREATE POLICY "presentations_insert" ON public.presentations
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text));

CREATE POLICY "presentations_update" ON public.presentations
  FOR UPDATE TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text))
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text));

CREATE POLICY "presentations_delete" ON public.presentations
  FOR DELETE TO authenticated
  USING (public.user_owns_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text));

-- Storage bucket for presentation files (PDF-only for now; pptx MIME type to be added when supported)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-presentations', 'lesson-presentations', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET file_size_limit = 104857600, -- 100MB
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'lesson-presentations';

-- Mirror the hardened course-videos storage.objects convention:
-- writes restricted to instructor/admin role, reads to instructor/admin or any enrolled user.
CREATE POLICY "instructors_admins_upload_lesson_presentations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lesson-presentations'
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()::text AND u.role IN ('instructor','admin'))
);

CREATE POLICY "instructors_admins_update_lesson_presentations"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lesson-presentations'
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()::text AND u.role IN ('instructor','admin'))
);

CREATE POLICY "instructors_admins_delete_lesson_presentations"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lesson-presentations'
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()::text AND u.role IN ('instructor','admin'))
);

CREATE POLICY "lesson_presentations_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lesson-presentations'
  AND (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()::text AND u.role IN ('instructor','admin'))
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id::text = auth.uid()::text)
  )
);
