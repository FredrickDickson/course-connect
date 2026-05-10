-- 1) Restrict sensitive column exposure on public.users
REVOKE SELECT ON public.users FROM anon, authenticated;
GRANT SELECT (
  id, email, first_name, last_name, middle_name, profile_image_url,
  role, bio, country, timezone, current_employer, job_title,
  current_level, pathway_type, created_at, updated_at
) ON public.users TO authenticated;
GRANT SELECT (
  id, first_name, last_name, profile_image_url, bio
) ON public.users TO anon;

-- 2) Remove broad public read on discussions/replies
DROP POLICY IF EXISTS "Discussions are viewable by everyone" ON public.discussions;
DROP POLICY IF EXISTS "Replies are viewable by everyone" ON public.replies;

-- 3) Fix avatars public read so they are actually public
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "user_avatars_public_read" ON storage.objects;
CREATE POLICY "user_avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

-- 4) Assignment submissions: allow owner delete/update
DROP POLICY IF EXISTS "assignment_submissions_user_delete" ON storage.objects;
CREATE POLICY "assignment_submissions_user_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "assignment_submissions_user_update" ON storage.objects;
CREATE POLICY "assignment_submissions_user_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5) Expedited documents: owner + admin policies
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

-- 6) Allow authenticated users to read pricing_config (for client-side pricing display)
DROP POLICY IF EXISTS "Authenticated can view pricing" ON public.pricing_config;
CREATE POLICY "Authenticated can view pricing"
  ON public.pricing_config FOR SELECT TO authenticated
  USING (true);

-- 7) Set immutable search_path on remaining functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_pathway_progress_on_enrollment() SET search_path = public;
ALTER FUNCTION public.update_enrollment_progress() SET search_path = public;
ALTER FUNCTION public.calculate_enrollment_progress(uuid, character varying) SET search_path = public;
ALTER FUNCTION public.recalculate_all_enrollment_progress() SET search_path = public;
ALTER FUNCTION public.verify_member(text) SET search_path = public;

-- 8) Revoke anon EXECUTE on remaining SECURITY DEFINER functions
DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.award_post_points(uuid, integer) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.award_reply_points(uuid, integer) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.award_official_answer_points(uuid, integer) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.award_reputation_points(uuid, integer, text) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_popular_tags(integer) FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.calculate_member_level(text) FROM anon';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;