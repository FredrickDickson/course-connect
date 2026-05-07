
REVOKE EXECUTE ON FUNCTION public.award_post_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_reply_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_official_answer_points(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_member_level(text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_popular_tags(integer) FROM PUBLIC, authenticated;
