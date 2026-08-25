-- Fix 1: infinite RLS recursion on assignment_group_members.
--
-- assignment_group_members_select checked group membership via a subquery
-- against assignment_group_members itself, which re-triggers that same
-- policy on the inner query -> infinite recursion (Postgres error 42P17).
-- Because storage.objects policies for the assignment-submissions bucket
-- (assignment_submissions_read/_group_write/_group_update/_group_delete)
-- also query assignment_group_members, Postgres has to evaluate this broken
-- policy whenever it plans ANY RLS-checked query against storage.objects --
-- so this one bug broke authenticated (non-service-role) uploads/reads for
-- every storage bucket in the app, not just assignment-submissions.
--
-- Fix: move the membership check into a SECURITY DEFINER function (same
-- pattern already used by public.is_admin() elsewhere in this schema) so the
-- inner lookup bypasses RLS instead of re-entering the same policy.
CREATE OR REPLACE FUNCTION public.user_in_assignment_group(p_group_id uuid, p_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.assignment_group_members gm2
    WHERE gm2.group_id = p_group_id AND gm2.user_id::text = p_user_id
  )
$fn$;

DROP POLICY IF EXISTS "assignment_group_members_select" ON public.assignment_group_members;
CREATE POLICY "assignment_group_members_select"
  ON public.assignment_group_members FOR SELECT TO authenticated
  USING (
    public.user_in_assignment_group(group_id, (auth.uid())::text)
    OR user_owns_course(assignment_course_id(assignment_id), auth.uid())
  );

-- Fix 2: expedited-documents Storage bucket drift.
--
-- The bucket existed live but with none of the RLS policies its own
-- migrations (20260424000000_expedited_p0.sql,
-- 20260510185753_b8de4610-8847-49bd-9e93-9b9082477473.sql) declare, and its
-- config (public, no size/type limits) didn't match either migration's
-- intent. This reconciles the live bucket to the originally-intended,
-- private, size/type-limited configuration and (re-)creates the owner
-- select/insert/delete policies so authenticated students/admins can
-- actually use it. The app only ever reads documents via signed URLs
-- (see client/src/pages/expedited-application.tsx and
-- admin-expedited-reviews.tsx), so making the bucket private is safe.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
WHERE id = 'expedited-documents';

DROP POLICY IF EXISTS "expedited_documents_owner_select" ON storage.objects;
CREATE POLICY "expedited_documents_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'expedited-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid()::text)
    )
  );

DROP POLICY IF EXISTS "expedited_documents_owner_insert" ON storage.objects;
CREATE POLICY "expedited_documents_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'expedited-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "expedited_documents_owner_delete" ON storage.objects;
CREATE POLICY "expedited_documents_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'expedited-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid()::text)
    )
  );
