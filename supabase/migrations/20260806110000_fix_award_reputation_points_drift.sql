-- The live award_reputation_points() function had drifted from this
-- project's migration history: it tried to INSERT INTO a "reputation_points"
-- table that was never created, instead of updating profiles.reputation_points
-- (the column added in 20260415210000_add_user_reputation.sql). Any insert
-- into forum_posts/forum_replies triggered this and failed with
-- 42P01 "relation reputation_points does not exist".
--
-- Restoring the original UPDATE-based body (below) then hit a second,
-- separate bug: the parameter was named "user_id", which is also a real
-- column on profiles (profiles.user_id, the FK to the auth user, distinct
-- from profiles.id) - PL/pgSQL couldn't tell "WHERE id = user_id" meant the
-- parameter vs. the column ("42702 column reference user_id is ambiguous").
-- Renaming the parameters with a p_ prefix avoids all such shadowing.

DROP FUNCTION IF EXISTS award_reputation_points(uuid, integer, text);

CREATE OR REPLACE FUNCTION award_reputation_points(
  p_user_id UUID,
  p_points INTEGER,
  p_achievement_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET reputation_points = COALESCE(reputation_points, 0) + p_points
  WHERE id = p_user_id;

  IF p_achievement_type IS NOT NULL THEN
    INSERT INTO user_achievements (user_id, achievement_type)
    VALUES (p_user_id, p_achievement_type)
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_reputation_points TO authenticated;
