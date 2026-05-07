
-- 1) search_path
ALTER FUNCTION public.auto_generate_certificate_verification_code() SET search_path = public;
ALTER FUNCTION public.award_official_answer_points() SET search_path = public;
ALTER FUNCTION public.award_post_points() SET search_path = public;
ALTER FUNCTION public.award_reply_points() SET search_path = public;
ALTER FUNCTION public.award_reputation_points(uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.calculate_member_level(text) SET search_path = public;
ALTER FUNCTION public.generate_certificate_verification_code() SET search_path = public;
ALTER FUNCTION public.generate_member_id() SET search_path = public;
ALTER FUNCTION public.get_popular_tags(integer) SET search_path = public;
ALTER FUNCTION public.get_user_post_nominal(text, text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_public_user_created() SET search_path = public;
ALTER FUNCTION public.is_admin(text) SET search_path = public;
ALTER FUNCTION public.update_content_reports_updated_at() SET search_path = public;
ALTER FUNCTION public.update_follow_counts() SET search_path = public;
ALTER FUNCTION public.update_track_progress_on_enrollment_completion() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 2) Revoke EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_public_user_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_track_progress_on_enrollment_completion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_post_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_reply_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_official_answer_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_reputation_points(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_member_level(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_popular_tags(integer) FROM PUBLIC, anon;

-- 3) Tighten course_waitlist
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.course_waitlist;
DROP POLICY IF EXISTS "Authenticated can join waitlist" ON public.course_waitlist;

CREATE POLICY "Public can join waitlist with valid data"
ON public.course_waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (
  course_id IS NOT NULL
  AND length(trim(full_name)) BETWEEN 1 AND 200
  AND length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

-- 4) Move pg_net to extensions schema (drop + recreate; it has no user data)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
