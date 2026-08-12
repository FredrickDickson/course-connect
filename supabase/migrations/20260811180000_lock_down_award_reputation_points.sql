-- award_reputation_points(p_user_id, p_points, p_achievement_type) is a
-- SECURITY DEFINER function with no internal auth check, and was
-- executable by anon -- anyone, unauthenticated, could award arbitrary
-- reputation points/achievements to any user. It has no caller anywhere
-- in the codebase (client, server, or edge functions), so lock it down
-- entirely rather than guess at intended access rules.

REVOKE EXECUTE ON FUNCTION public.award_reputation_points(uuid, integer, text) FROM anon, authenticated, PUBLIC;
