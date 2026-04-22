-- Add qualification pathway fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_level TEXT DEFAULT 'NONE' CHECK (current_level IN ('NONE', 'ASSOCIATE', 'MEMBER', 'FELLOW')),
ADD COLUMN IF NOT EXISTS pathway_type TEXT CHECK (pathway_type IN ('STANDARD', 'EXPEDITED', 'HYBRID')),
ADD COLUMN IF NOT EXISTS eligibility_flags JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS years_adr_experience INTEGER DEFAULT 0 CHECK (years_adr_experience >= 0),
ADD COLUMN IF NOT EXISTS years_legal_experience INTEGER DEFAULT 0 CHECK (years_legal_experience >= 0);

-- Create expedited_applications table
CREATE TABLE IF NOT EXISTS expedited_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_level TEXT NOT NULL CHECK (target_level IN ('MEMBER', 'FELLOW')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  cv_url TEXT,
  experience_summary TEXT,
  qualifications_summary TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  review_comments TEXT,
  assessment_score NUMERIC(5, 2),
  assessment_passed BOOLEAN,
  assessment_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create application_documents table
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES expedited_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('certificate', 'degree', 'transcript', 'cv', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create qualification_assessments table
CREATE TABLE IF NOT EXISTS qualification_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES expedited_applications(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('member_14day', 'fellow_48hour')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC(5, 2),
  passed BOOLEAN,
  submission_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expedited_applications_user_id ON expedited_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_expedited_applications_status ON expedited_applications(status);
CREATE INDEX IF NOT EXISTS idx_expedited_applications_target_level ON expedited_applications(target_level);
CREATE INDEX IF NOT EXISTS idx_expedited_applications_submitted_at ON expedited_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_qualification_assessments_application_id ON qualification_assessments(application_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_expedited_applications_updated_at
  BEFORE UPDATE ON expedited_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qualification_assessments_updated_at
  BEFORE UPDATE ON qualification_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE expedited_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expedited_applications
-- Users can view their own applications
CREATE POLICY "Users can view own expedited applications"
  ON expedited_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all expedited applications"
  ON expedited_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can insert their own applications
CREATE POLICY "Users can insert own expedited applications"
  ON expedited_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own applications (only before review)
CREATE POLICY "Users can update own expedited applications"
  ON expedited_applications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Admins can update all applications
CREATE POLICY "Admins can update expedited applications"
  ON expedited_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for application_documents
-- Users can view documents for their own applications
CREATE POLICY "Users can view own application documents"
  ON application_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = application_documents.application_id
      AND expedited_applications.user_id = auth.uid()
    )
  );

-- Admins can view all documents
CREATE POLICY "Admins can view all application documents"
  ON application_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can insert documents for their own applications
CREATE POLICY "Users can insert own application documents"
  ON application_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = application_documents.application_id
      AND expedited_applications.user_id = auth.uid()
      AND expedited_applications.status = 'pending'
    )
  );

-- RLS Policies for qualification_assessments
-- Users can view their own assessments
CREATE POLICY "Users can view own qualification assessments"
  ON qualification_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = qualification_assessments.application_id
      AND expedited_applications.user_id = auth.uid()
    )
  );

-- Admins can view all assessments
CREATE POLICY "Admins can view all qualification assessments"
  ON qualification_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can insert their own assessments
CREATE POLICY "Users can insert own qualification assessments"
  ON qualification_assessments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = qualification_assessments.application_id
      AND expedited_applications.user_id = auth.uid()
    )
  );

-- Users can update their own assessments (before completion)
CREATE POLICY "Users can update own qualification assessments"
  ON qualification_assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = qualification_assessments.application_id
      AND expedited_applications.user_id = auth.uid()
    )
    AND completed_at IS NULL
  );

-- Admins can update all assessments
CREATE POLICY "Admins can update qualification assessments"
  ON qualification_assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE expedited_applications IS 'Stores expedited membership applications for users seeking to skip standard training';
COMMENT ON TABLE application_documents IS 'Stores supporting documents (certificates, CVs, degrees) for expedited applications';
COMMENT ON TABLE qualification_assessments IS 'Stores assessment submissions for expedited pathway applications';
COMMENT ON COLUMN users.current_level IS 'Current qualification level: NONE, ASSOCIATE, MEMBER, or FELLOW';
COMMENT ON COLUMN users.pathway_type IS 'Type of pathway: STANDARD, EXPEDITED, or HYBRID';
COMMENT ON COLUMN users.eligibility_flags IS 'JSONB flags for eligibility: {canApplyFellow: boolean, expeditedEligible: boolean}';
COMMENT ON COLUMN users.years_adr_experience IS 'Years of ADR (Alternative Dispute Resolution) experience';
COMMENT ON COLUMN users.years_legal_experience IS 'Years of legal practice experience';
