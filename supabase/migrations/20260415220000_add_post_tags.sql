-- Create post_tags table for storing tags on posts
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, tag)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);
CREATE INDEX IF NOT EXISTS idx_post_tags_created_at ON post_tags(created_at DESC);

-- Enable RLS
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tags on posts"
  ON post_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can insert tags on their own posts"
  ON post_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forum_posts 
      WHERE id = post_id 
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from their own posts"
  ON post_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM forum_posts 
      WHERE id = post_id 
      AND author_id = auth.uid()
    )
  );

-- Function to get popular tags
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.tag,
    COUNT(*)::BIGINT as count
  FROM post_tags pt
  GROUP BY pt.tag
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
