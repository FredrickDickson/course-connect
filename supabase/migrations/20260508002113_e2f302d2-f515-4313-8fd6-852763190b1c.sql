
-- Add is_preview to lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_preview boolean NOT NULL DEFAULT false;

-- ============ lesson_notes ============
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content text NOT NULL,
  video_timestamp_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_user_lesson ON public.lesson_notes(user_id, lesson_id);
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select_own" ON public.lesson_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_own" ON public.lesson_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON public.lesson_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON public.lesson_notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_lesson_notes_updated BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ lesson_questions ============
CREATE TABLE IF NOT EXISTS public.lesson_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_answered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson ON public.lesson_questions(lesson_id);
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select_visible" ON public.lesson_questions FOR SELECT
  USING (public.user_can_view_lesson(lesson_id, auth.uid()));
CREATE POLICY "questions_insert_author" ON public.lesson_questions FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.user_can_view_lesson(lesson_id, auth.uid()));
CREATE POLICY "questions_update_author" ON public.lesson_questions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "questions_delete_author" ON public.lesson_questions FOR DELETE USING (auth.uid() = author_id);
CREATE TRIGGER trg_lesson_questions_updated BEFORE UPDATE ON public.lesson_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ lesson_question_replies ============
CREATE TABLE IF NOT EXISTS public.lesson_question_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.lesson_questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  is_instructor_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_question_replies_q ON public.lesson_question_replies(question_id);
ALTER TABLE public.lesson_question_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies_select_visible" ON public.lesson_question_replies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lesson_questions q
    WHERE q.id = question_id AND public.user_can_view_lesson(q.lesson_id, auth.uid())
  ));
CREATE POLICY "replies_insert_author" ON public.lesson_question_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.lesson_questions q
    WHERE q.id = question_id AND public.user_can_view_lesson(q.lesson_id, auth.uid())
  ));
CREATE POLICY "replies_update_author" ON public.lesson_question_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "replies_delete_author" ON public.lesson_question_replies FOR DELETE USING (auth.uid() = author_id);

-- ============ lesson_resources ============
CREATE TABLE IF NOT EXISTS public.lesson_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  file_size_mb numeric,
  resource_type text NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON public.lesson_resources(lesson_id);
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_select_visible" ON public.lesson_resources FOR SELECT
  USING (public.user_can_view_lesson(lesson_id, auth.uid()));
CREATE POLICY "resources_write_owner" ON public.lesson_resources FOR ALL
  USING (public.user_owns_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text))
  WITH CHECK (public.user_owns_lesson(lesson_id, auth.uid()) OR public.is_admin(auth.uid()::text));

-- ============ course_announcements ============
CREATE TABLE IF NOT EXISTS public.course_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_announcements_course ON public.course_announcements(course_id);
ALTER TABLE public.course_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_select_enrolled" ON public.course_announcements FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id::text = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_announcements.course_id AND e.user_id::text = auth.uid()::text)
    OR public.is_admin(auth.uid()::text)
  );
CREATE POLICY "announcements_write_instructor" ON public.course_announcements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id::text = auth.uid()::text)
    OR public.is_admin(auth.uid()::text)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.instructor_id::text = auth.uid()::text)
    OR public.is_admin(auth.uid()::text)
  );

-- ============ announcement_reads ============
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES public.course_announcements(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads_select_own" ON public.announcement_reads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reads_upsert_own" ON public.announcement_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reads_delete_own" ON public.announcement_reads FOR DELETE USING (auth.uid() = user_id);

-- ============ lesson-resources storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-resources', 'lesson-resources', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lesson_resources_read_enrolled" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lesson-resources'
    AND auth.uid() IS NOT NULL
  );
CREATE POLICY "lesson_resources_write_owner" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-resources' AND auth.uid() IS NOT NULL);
CREATE POLICY "lesson_resources_update_owner" ON storage.objects FOR UPDATE
  USING (bucket_id = 'lesson-resources' AND owner = auth.uid());
CREATE POLICY "lesson_resources_delete_owner" ON storage.objects FOR DELETE
  USING (bucket_id = 'lesson-resources' AND owner = auth.uid());
