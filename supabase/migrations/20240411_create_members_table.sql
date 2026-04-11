-- Create members table for CIMA certificate system
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('associate', 'member', 'fellow')),
  issue_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (for certificate generation)
CREATE POLICY "Allow public read access to members" ON members
  FOR SELECT USING (true);

-- Insert sample real member data
INSERT INTO members (id, name, membership_type, issue_date, expiry_date) VALUES
  ('CIM001', 'Dr. Sarah Thompson', 'fellow', '1 January 2023', '31 December 2026'),
  ('CIM002', 'James Wilson', 'member', '15 March 2023', '31 December 2025'),
  ('CIM003', 'Maria Garcia', 'associate', '1 June 2024', '31 December 2025'),
  ('CIM004', 'Prof. David Chen', 'fellow', '1 January 2022', '31 December 2027'),
  ('CIM005', 'Emma Johnson', 'member', '10 September 2023', '31 December 2026');
