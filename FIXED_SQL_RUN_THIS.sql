-- ========================================
-- BROCHURE DOWNLOADS TABLE - SIMPLIFIED VERSION
-- This will work on any Supabase version
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table
CREATE TABLE IF NOT EXISTS brochure_downloads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_brochure_downloads_email 
  ON brochure_downloads(email);
  
CREATE INDEX IF NOT EXISTS idx_brochure_downloads_date 
  ON brochure_downloads(downloaded_at DESC);

-- Enable RLS
ALTER TABLE brochure_downloads ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Anyone can submit brochure download" ON brochure_downloads;
DROP POLICY IF EXISTS "Admins can view all downloads" ON brochure_downloads;

-- Allow public inserts (anyone can download brochure)
CREATE POLICY "Anyone can submit brochure download"
  ON brochure_downloads
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view (simplified - checks if user exists and is admin)
CREATE POLICY "Admins can view all downloads"
  ON brochure_downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Grant permissions
GRANT INSERT ON brochure_downloads TO anon;
GRANT INSERT ON brochure_downloads TO authenticated;
GRANT SELECT ON brochure_downloads TO authenticated;

-- Success message
SELECT 'SUCCESS! Table created' as message, 
       'brochure_downloads' as table_name,
       0 as initial_records;
