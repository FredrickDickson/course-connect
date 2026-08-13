-- ========================================
-- BROCHURE DOWNLOADS TABLE - CIMA LEARN
-- Copy this entire file and run in Supabase SQL Editor
-- ========================================

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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_brochure_downloads_email ON brochure_downloads(email);
CREATE INDEX IF NOT EXISTS idx_brochure_downloads_date ON brochure_downloads(downloaded_at DESC);

-- Enable Row Level Security
ALTER TABLE brochure_downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit brochure download" ON brochure_downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON brochure_downloads;

-- Policy 1: Allow anyone to insert (for public form submissions)
CREATE POLICY "Anyone can submit brochure download"
  ON brochure_downloads
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Only admins can view all downloads
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

-- Grant necessary permissions
GRANT INSERT ON brochure_downloads TO anon, authenticated;
GRANT SELECT ON brochure_downloads TO authenticated;

-- Add helpful comment
COMMENT ON TABLE brochure_downloads IS 'Tracks brochure downloads from the landing page for lead generation and analytics';

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 
  'SUCCESS! Brochure downloads table created' as status,
  COUNT(*) as initial_count 
FROM brochure_downloads;
