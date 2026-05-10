-- Enhanced eligibility fields for expedited routes based on guide requirements
-- Add missing fields to properly support LLM verification, ACIMArb membership, and professional assessments

-- Add additional fields to users table for comprehensive eligibility checking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_llm_degree BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS llm_institution TEXT,
ADD COLUMN IF NOT EXISTS llm_specialization TEXT,
ADD COLUMN IF NOT EXISTS llm_graduation_year INTEGER,
ADD COLUMN IF NOT EXISTS professional_portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS award_writing_samples JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS current_employer TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS bar_admission_number TEXT,
ADD COLUMN IF NOT EXISTS bar_jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS professional_references JSONB DEFAULT '[]';

-- Add eligibility assessment fields to expedited_applications table
ALTER TABLE expedited_applications
ADD COLUMN IF NOT EXISTS application_type TEXT CHECK (application_type IN ('expedited_member', 'expedited_fellow')),
ADD COLUMN IF NOT EXISTS pathway_track TEXT CHECK (pathway_track IN ('ARBITRATION', 'MEDIATION')),
ADD COLUMN IF NOT EXISTS eligibility_notes TEXT,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assessment_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS assessment_modules_completed JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS professional_writing_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS understanding_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS application_score NUMERIC(5,2);

-- Create new table for assessment module tracking
CREATE TABLE IF NOT EXISTS assessment_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES expedited_applications(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  module_title TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  score NUMERIC(5,2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create new table for assessment rubrics
CREATE TABLE IF NOT EXISTS assessment_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type TEXT NOT NULL,
  criteria_name TEXT NOT NULL,
  criteria_description TEXT,
  max_score NUMERIC(5,2) NOT NULL,
  weight_percentage NUMERIC(5,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert assessment rubrics for expedited member (MCIMArb)
INSERT INTO assessment_rubrics (assessment_type, criteria_name, criteria_description, max_score, weight_percentage) VALUES
('expedited_member', 'understanding', 'Understanding of arbitration principles and application to facts/scenarios', 30, 0.30),
('expedited_member', 'application', 'Professional application of arbitration law to practical scenarios', 40, 0.40),
('expedited_member', 'writing', 'Professional writing quality, structure, and clarity', 30, 0.30)
ON CONFLICT DO NOTHING;

-- Insert assessment rubrics for expedited fellow (FCIMArb)
INSERT INTO assessment_rubrics (assessment_type, criteria_name, criteria_description, max_score, weight_percentage) VALUES
('expedited_fellow', 'award_writing', 'Quality and structure of award writing', 40, 0.40),
('expedited_fellow', 'reasoning', 'Legal reasoning and analysis quality', 30, 0.30),
('expedited_fellow', 'professional_judgment', 'Professional judgment and practical application', 30, 0.30)
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_has_llm_degree ON users(has_llm_degree);
CREATE INDEX IF NOT EXISTS idx_users_bar_admission ON users(bar_admission_number);
CREATE INDEX IF NOT EXISTS idx_expedited_applications_type ON expedited_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_expedited_applications_track ON expedited_applications(pathway_track);
CREATE INDEX IF NOT EXISTS idx_assessment_modules_application_id ON assessment_modules(application_id);
CREATE INDEX IF NOT EXISTS idx_assessment_modules_code ON assessment_modules(module_code);
CREATE INDEX IF NOT EXISTS idx_assessment_rubrics_type ON assessment_rubrics(assessment_type);

-- Add updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_assessment_modules_updated_at ON assessment_modules;
CREATE TRIGGER update_assessment_modules_updated_at
  BEFORE UPDATE ON assessment_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE assessment_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_rubrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_modules
-- Users can view modules for their own applications
DROP POLICY IF EXISTS "Users can view own assessment modules" ON assessment_modules;
CREATE POLICY "Users can view own assessment modules"
  ON assessment_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = assessment_modules.application_id
      AND expedited_applications.user_id::text = auth.uid()::text
    )
  );

-- Admins can view all modules
DROP POLICY IF EXISTS "Admins can view all assessment modules" ON assessment_modules;
CREATE POLICY "Admins can view all assessment modules"
  ON assessment_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Users can insert modules for their own applications
DROP POLICY IF EXISTS "Users can insert own assessment modules" ON assessment_modules;
CREATE POLICY "Users can insert own assessment modules"
  ON assessment_modules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expedited_applications
      WHERE expedited_applications.id = assessment_modules.application_id
      AND expedited_applications.user_id::text = auth.uid()::text
    )
  );

-- Admins can update all modules
DROP POLICY IF EXISTS "Admins can update assessment modules" ON assessment_modules;
CREATE POLICY "Admins can update assessment modules"
  ON assessment_modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- RLS Policies for assessment_rubrics (read-only for all users, write-only for admins)
DROP POLICY IF EXISTS "All users can view assessment rubrics" ON assessment_rubrics;
CREATE POLICY "All users can view assessment rubrics"
  ON assessment_rubrics FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage assessment rubrics" ON assessment_rubrics;
CREATE POLICY "Admins can manage assessment rubrics"
  ON assessment_rubrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN users.has_llm_degree IS 'Indicates if user has an LL.M degree (Master of Laws)';
COMMENT ON COLUMN users.llm_institution IS 'Institution where LL.M degree was obtained';
COMMENT ON COLUMN users.llm_specialization IS 'Specialization area of LL.M degree (e.g., Arbitration, International Law)';
COMMENT ON COLUMN users.llm_graduation_year IS 'Year of LL.M graduation';
COMMENT ON COLUMN users.professional_portfolio_url IS 'URL to professional portfolio or CV';
COMMENT ON COLUMN users.award_writing_samples IS 'JSON array of award writing sample URLs or descriptions';
COMMENT ON COLUMN users.bar_admission_number IS 'Bar admission number for legal professionals';
COMMENT ON COLUMN users.bar_jurisdiction IS 'Jurisdiction of bar admission';
COMMENT ON COLUMN users.professional_references IS 'JSON array of professional references';
COMMENT ON COLUMN expedited_applications.application_type IS 'Type of expedited application: expedited_member or expedited_fellow';
COMMENT ON COLUMN expedited_applications.pathway_track IS 'Track for the application: ARBITRATION or MEDIATION';
COMMENT ON COLUMN expedited_applications.eligibility_notes IS 'Notes about eligibility determination';
COMMENT ON COLUMN expedited_applications.documents IS 'JSON object containing uploaded document metadata';
COMMENT ON COLUMN expedited_applications.assessment_submitted_at IS 'Timestamp when assessment was submitted';
COMMENT ON COLUMN expedited_applications.professional_writing_score IS 'Score for professional writing criteria (0-30)';
COMMENT ON COLUMN expedited_applications.understanding_score IS 'Score for understanding criteria (0-30)';
COMMENT ON COLUMN expedited_applications.application_score IS 'Score for application criteria (0-40)';
COMMENT ON TABLE assessment_modules IS 'Tracks completion of specific assessment modules for expedited applications';
COMMENT ON TABLE assessment_rubrics IS 'Defines scoring rubrics for different assessment types';
