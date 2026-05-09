
-- ============================================================
-- 1. STORAGE: tighten upload policies with folder ownership
-- ============================================================

-- course-thumbnails: only instructors/admins, scoped to own folder
DROP POLICY IF EXISTS "course_thumbnails_instructor_write" ON storage.objects;
CREATE POLICY "course_thumbnails_instructor_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-thumbnails'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = (auth.uid())::text
      AND u.role IN ('instructor','admin')
  )
);

-- instructor-cv: drop duplicate weak policy, keep ownership-scoped one
DROP POLICY IF EXISTS "Authenticated users can upload CV" ON storage.objects;

-- instructor-videos: drop duplicate weak policy, fix the other to require folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload intro video" ON storage.objects;
DROP POLICY IF EXISTS "instructor_videos_instructor_write" ON storage.objects;
CREATE POLICY "instructor_videos_instructor_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'instructor-videos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- lesson-resources: require folder ownership
DROP POLICY IF EXISTS "lesson_resources_write_owner" ON storage.objects;
CREATE POLICY "lesson_resources_write_owner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-resources'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- forum-attachments: scope writes and deletes by folder ownership
DROP POLICY IF EXISTS "forum_attachments_user_write" ON storage.objects;
CREATE POLICY "forum_attachments_user_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'forum-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "forum_attachments_user_delete" ON storage.objects;
CREATE POLICY "forum_attachments_user_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'forum-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- certificates bucket: certificates are issued for public verification.
-- Allow anyone holding the URL to read the file (the bucket is already public).
DROP POLICY IF EXISTS "certificates_public_read" ON storage.objects;
CREATE POLICY "certificates_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'certificates');

-- ============================================================
-- 2. PUBLIC TABLES: stop leaking PII to anonymous visitors
-- ============================================================

-- users: instructor rows were readable by anon (leaked emails). Require auth.
DROP POLICY IF EXISTS "users_view_instructor_profiles" ON public.users;
CREATE POLICY "users_view_instructor_profiles"
ON public.users
FOR SELECT
TO authenticated
USING (role::text = 'instructor');

-- profiles: same — instructor profiles were readable by anon.
DROP POLICY IF EXISTS "Public can view instructor profiles" ON public.profiles;
CREATE POLICY "Authenticated can view instructor profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = profiles.user_id
      AND u.role::text = 'instructor'
  )
);

-- sessions: should never be exposed via PostgREST.
DROP POLICY IF EXISTS "sessions_view_own" ON public.sessions;
REVOKE ALL ON public.sessions FROM anon, authenticated;

-- course_templates: internal config, restrict to authenticated.
DROP POLICY IF EXISTS "Anyone can view templates" ON public.course_templates;
CREATE POLICY "Authenticated users can view templates"
ON public.course_templates
FOR SELECT
TO authenticated
USING (true);

-- assessment_rubrics: scoring criteria, restrict to authenticated.
DROP POLICY IF EXISTS "All users can view assessment rubrics" ON public.assessment_rubrics;
CREATE POLICY "Authenticated users can view active rubrics"
ON public.assessment_rubrics
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================
-- 3. SECURITY DEFINER FUNCTIONS: revoke anonymous EXECUTE
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.create_lesson(uuid, text, text, text, text, text, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_view_lesson(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_view_question(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_view_quiz(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_lesson(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_module(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_question(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_quiz(uuid, uuid) FROM anon;
