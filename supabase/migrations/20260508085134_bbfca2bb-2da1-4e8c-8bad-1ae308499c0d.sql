
-- 1. users: drop the open SELECT and the unrestricted UPDATE that enables role escalation
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 2. members: drop anon-readable PII policy, expose verification via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Public can verify members" ON public.members;

CREATE OR REPLACE FUNCTION public.verify_member(_member_id text)
RETURNS TABLE (
  member_id text,
  full_name text,
  part public.membership_level,
  status public.membership_status,
  issue_date timestamptz,
  expiry_date timestamptz,
  post_nominal text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.member_id,
    -- show first name + last initial only to limit PII
    COALESCE(
      split_part(m.full_name, ' ', 1) ||
      CASE
        WHEN position(' ' in m.full_name) > 0
          THEN ' ' || left(split_part(m.full_name, ' ', 2), 1) || '.'
        ELSE ''
      END,
      ''
    ) AS full_name,
    m.part,
    m.status,
    m.issue_date,
    m.expiry_date,
    m.post_nominal
  FROM public.members m
  WHERE m.member_id = _member_id
    AND m.status = ANY (ARRAY['active'::public.membership_status,'expiring'::public.membership_status,'expired'::public.membership_status]);
$$;

REVOKE ALL ON FUNCTION public.verify_member(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_member(text) TO anon, authenticated;

-- 3. certificates: drop fully-public read (own + admin policies remain)
DROP POLICY IF EXISTS "Public can verify certificates" ON public.certificates;

-- 4. forum_posts: drop the unconditional public read (auth-gated policy remains)
DROP POLICY IF EXISTS "forum_posts_public_read" ON public.forum_posts;

-- 5. storage.objects: instructor CVs / videos no longer publicly readable
DROP POLICY IF EXISTS "Public read access for instructor CVs" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for instructor videos" ON storage.objects;

CREATE POLICY "Instructor CV owner or admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'instructor-cv'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid()::text)
  )
);

CREATE POLICY "Instructor video owner or admin read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'instructor-videos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid()::text)
  )
);

-- 6. assignment-submissions: enforce ownership on upload
DROP POLICY IF EXISTS "assignment_submissions_user_write" ON storage.objects;
CREATE POLICY "assignment_submissions_user_write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. course-videos: restrict writes to instructors/admins
DROP POLICY IF EXISTS "authenticated_users_upload_videos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_update_videos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_delete_videos" ON storage.objects;

CREATE POLICY "instructors_admins_upload_course_videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('instructor','admin')
  )
);

CREATE POLICY "instructors_admins_update_course_videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('instructor','admin')
  )
);

CREATE POLICY "instructors_admins_delete_course_videos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'course-videos'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('instructor','admin')
  )
);

-- 8. course-videos read: limit to enrolled users, instructors, or admins
DROP POLICY IF EXISTS "course_videos_enrolled_read" ON storage.objects;
CREATE POLICY "course_videos_enrolled_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'course-videos'
  AND (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.role IN ('instructor','admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id::text = auth.uid()::text
    )
  )
);
