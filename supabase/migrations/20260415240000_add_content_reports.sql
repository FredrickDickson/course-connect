-- Create content_reports table for user reports
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply', 'user')),
  target_id UUID NOT NULL,
  report_category TEXT NOT NULL CHECK (report_category IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  report_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON content_reports(created_at DESC);

-- Enable RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports"
  ON content_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND community_role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Users can create reports"
  ON content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can update reports"
  ON content_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND community_role IN ('moderator', 'admin')
    )
  );

-- Update timestamp on changes
CREATE OR REPLACE FUNCTION update_content_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_content_report_update
  BEFORE UPDATE ON content_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_content_reports_updated_at();
