-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table for brochure downloads tracking
CREATE TABLE IF NOT EXISTS brochure_downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for email lookups and analytics
CREATE INDEX IF NOT EXISTS idx_brochure_downloads_email ON brochure_downloads(email);
CREATE INDEX IF NOT EXISTS idx_brochure_downloads_date ON brochure_downloads(downloaded_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE brochure_downloads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for public form submissions)
CREATE POLICY "Anyone can submit brochure download"
  ON brochure_downloads
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view all downloads
CREATE POLICY "Admins can view all downloads"
  ON brochure_downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Grant access
GRANT INSERT ON brochure_downloads TO anon, authenticated;
GRANT SELECT ON brochure_downloads TO authenticated;

-- Add comment
COMMENT ON TABLE brochure_downloads IS 'Tracks brochure downloads from the landing page for lead generation and analytics';
