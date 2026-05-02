-- Review Prompts Table for collecting user feedback
-- Triggers: midway (50% progress) and end-of-course (after assessment)

CREATE TABLE IF NOT EXISTS review_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('midway', 'end_course')),
  prompt_question TEXT NOT NULL,
  shown_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  response TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, course_id, prompt_type)
);

CREATE INDEX IF NOT EXISTS idx_review_prompts_user_id ON review_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_review_prompts_course_id ON review_prompts(course_id);
CREATE INDEX IF NOT EXISTS idx_review_prompts_type ON review_prompts(prompt_type);

-- Enable RLS
ALTER TABLE review_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review prompts"
  ON review_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review prompts"
  ON review_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review prompts"
  ON review_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all review prompts"
  ON review_prompts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  ));

-- Updated at trigger
CREATE TRIGGER update_review_prompts_updated_at
  BEFORE UPDATE ON review_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE review_prompts IS 'User review prompts with midway (50% progress) and end-of-course triggers';
