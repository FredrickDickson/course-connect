-- First check if the table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'professional_documents'
);

-- Create professional_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS professional_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  document_type TEXT NOT NULL CHECK (document_type IN ('CV', 'CERTIFICATE', 'LICENSE', 'PORTFOLIO', 'REFERENCE', 'AWARD', 'OTHER')),
  file_url TEXT NOT NULL,
  storage_path TEXT,
  original_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'REVIEWERS', 'ADMIN', 'PUBLIC')),
  is_primary BOOLEAN DEFAULT false,
  reviewer_id UUID REFERENCES users(id),
  review_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_professional_documents_profile_id ON professional_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_professional_documents_uploaded_by ON professional_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_professional_documents_type ON professional_documents(document_type);

-- Enable RLS
ALTER TABLE professional_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own documents" ON professional_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON professional_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON professional_documents;
DROP POLICY IF EXISTS "Service role has full access" ON professional_documents;

-- Create RLS policies
CREATE POLICY "Users can view their own documents"
  ON professional_documents
  FOR SELECT
  USING (
    uploaded_by = auth.uid() 
    OR profile_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own documents"
  ON professional_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    OR profile_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all documents"
  ON professional_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Grant service role full access (bypass RLS)
CREATE POLICY "Service role has full access"
  ON professional_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'professional_documents'
ORDER BY ordinal_position;
