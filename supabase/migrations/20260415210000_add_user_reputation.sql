-- Add reputation columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- Create user_achievements table for tracking achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- 'first_post', 'helpful_reply', 'popular_post', etc.
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to award points
CREATE OR REPLACE FUNCTION award_reputation_points(
  user_id UUID,
  points INTEGER,
  achievement_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update reputation points
  UPDATE profiles 
  SET reputation_points = COALESCE(reputation_points, 0) + points
  WHERE id = user_id;
  
  -- If achievement type provided, record it
  IF achievement_type IS NOT NULL THEN
    INSERT INTO user_achievements (user_id, achievement_type)
    VALUES (user_id, achievement_type)
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION award_reputation_points TO authenticated;

-- Create trigger to award points for new posts
CREATE OR REPLACE FUNCTION award_post_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 10 points for creating a post
  PERFORM award_reputation_points(NEW.author_id, 10, 'first_post');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_created
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION award_post_points();

-- Create trigger to award points for helpful replies
CREATE OR REPLACE FUNCTION award_reply_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 5 points for creating a reply
  PERFORM award_reputation_points(NEW.author_id, 5, 'helpful_reply');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reply_created
  AFTER INSERT ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION award_reply_points();

-- Create trigger to award points when reply is marked as official answer
CREATE OR REPLACE FUNCTION award_official_answer_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 25 points when reply is marked as official answer
  IF NEW.is_official_answer = true AND (OLD.is_official_answer IS NULL OR OLD.is_official_answer = false) THEN
    PERFORM award_reputation_points(NEW.author_id, 20, 'official_answer');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_official_answer_marked
  AFTER UPDATE ON forum_replies
  FOR EACH ROW
  WHEN (OLD.is_official_answer IS DISTINCT FROM NEW.is_official_answer)
  EXECUTE FUNCTION award_official_answer_points();
