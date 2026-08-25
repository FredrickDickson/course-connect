-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS professional_documents CASCADE;

-- Create professional_documents table
-- Note: uploaded_by and reviewer_id are TEXT because users.id is character varying
CREATE TABLE professional_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  uploaded_by TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('CV', 'CERTIFICATE', 'LICENSE', 'PORTFOLIO', 'REFERENCE', 'AWARD', 'OTHER')),
  file_url TEXT NOT NULL,
  storage_path TEXT,
  original_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'REVIEWERS', 'ADMIN', 'PUBLIC')),
  is_primary BOOLEAN DEFAULT false,
  reviewer_id TEXT,
  review_notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_professional_documents_profile_id ON professional_documents(profile_id);
CREATE INDEX idx_professional_documents_uploaded_by ON professional_documents(uploaded_by);
CREATE INDEX idx_professional_documents_type ON professional_documents(document_type);

-- Enable RLS
ALTER TABLE professional_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (service role bypass is automatic in Supabase)
CREATE POLICY "Users can view their own documents"
  ON professional_documents
  FOR SELECT
  USING (
    uploaded_by = auth.uid()::text
    OR profile_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert their own documents"
  ON professional_documents
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM professional_profiles WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all documents"
  ON professional_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

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
