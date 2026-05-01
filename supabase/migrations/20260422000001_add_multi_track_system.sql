-- Multi-Track Qualification System Migration
-- Implements the logic from full logic.md for Arbitration and Mediation tracks

-- ============================================================================
-- 1. TRACK PROGRESS TABLE
-- Stores track-specific progression for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS track_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  level TEXT NOT NULL DEFAULT 'NONE' CHECK (level IN ('NONE', 'STUDENT', 'ASSOCIATE', 'MEMBER', 'FELLOW')),
  pathway TEXT CHECK (pathway IN ('STANDARD', 'EXPEDITED', 'HYBRID')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_track_progress_user_id ON track_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_track_progress_track ON track_progress(track);
CREATE INDEX IF NOT EXISTS idx_track_progress_level ON track_progress(level);

-- ============================================================================
-- 2. CERTIFICATES TABLE
-- Stores issued certificates with track, level, and pathway metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  level TEXT NOT NULL CHECK (level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  pathway TEXT CHECK (pathway IN ('STANDARD', 'EXPEDITED', 'HYBRID')),
  post_nominal TEXT NOT NULL, -- e.g., ACIMArb, MCIMArb, FCIMArb, ACIMed, MCIMed, FCIMed
  certificate_number TEXT UNIQUE NOT NULL,
  certificate_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  verification_url TEXT UNIQUE,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_track ON certificates(track);
CREATE INDEX IF NOT EXISTS idx_certificates_level ON certificates(level);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_url ON certificates(verification_url);

-- ============================================================================
-- 3. FELLOWSHIP APPLICATIONS TABLE
-- Separate from expedited applications for fellowship-specific workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS fellowship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  cv_url TEXT,
  experience_summary TEXT,
  qualifications_summary TEXT,
  portfolio_url TEXT,
  dissertation_url TEXT,
  dissertation_title TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  review_comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fellowship_applications_user_id ON fellowship_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_fellowship_applications_track ON fellowship_applications(track);
CREATE INDEX IF NOT EXISTS idx_fellowship_applications_status ON fellowship_applications(status);
CREATE INDEX IF NOT EXISTS idx_fellowship_applications_submitted_at ON fellowship_applications(submitted_at);

-- ============================================================================
-- 4. STUDENT MEMBERSHIP TABLE
-- Tracks student membership applications and verification
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_of_study TEXT NOT NULL,
  expected_graduation_date DATE,
  verification_document_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE, -- Student membership typically expires
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_memberships_user_id ON student_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_student_memberships_status ON student_memberships(status);
CREATE INDEX IF NOT EXISTS idx_student_memberships_expires_at ON student_memberships(expires_at);

-- ============================================================================
-- 5. COURSE COMPLETION RECORDS TABLE
-- Tracks course completions with track and level metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_completion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  track TEXT NOT NULL CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  level_achieved TEXT CHECK (level_achieved IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  assessment_passed BOOLEAN DEFAULT FALSE,
  assessment_score NUMERIC(5, 2),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  certificate_id UUID REFERENCES certificates(id),
  is_supplementary BOOLEAN DEFAULT FALSE, -- For retakes or additional training
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id, completed_at) -- Allows multiple completions over time
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_completion_records_user_id ON course_completion_records(user_id);
CREATE INDEX IF NOT EXISTS idx_course_completion_records_course_id ON course_completion_records(course_id);
CREATE INDEX IF NOT EXISTS idx_course_completion_records_track ON course_completion_records(track);
CREATE INDEX IF NOT EXISTS idx_course_completion_records_completed_at ON course_completion_records(completed_at);

-- ============================================================================
-- 6. UPDATED AT TRIGGER FUNCTION (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ADD UPDATED_AT TRIGGERS TO NEW TABLES
-- ============================================================================

CREATE TRIGGER update_track_progress_updated_at
  BEFORE UPDATE ON track_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fellowship_applications_updated_at
  BEFORE UPDATE ON fellowship_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_memberships_updated_at
  BEFORE UPDATE ON student_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_completion_records_updated_at
  BEFORE UPDATE ON course_completion_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fellowship_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_completion_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. RLS POLICIES FOR TRACK_PROGRESS
-- ============================================================================

-- Users can view their own track progress
CREATE POLICY "Users can view own track progress"
  ON track_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all track progress
CREATE POLICY "Admins can view all track progress"
  ON track_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can insert their own track progress
CREATE POLICY "Users can insert own track progress"
  ON track_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own track progress
CREATE POLICY "Users can update own track progress"
  ON track_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update all track progress
CREATE POLICY "Admins can update track progress"
  ON track_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 10. RLS POLICIES FOR CERTIFICATES
-- ============================================================================

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Public can verify certificates by certificate number
CREATE POLICY "Public can verify certificates"
  ON certificates FOR SELECT
  USING (true);

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates"
  ON certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only system/insert can create certificates (via backend functions)
CREATE POLICY "System can insert certificates"
  ON certificates FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 11. RLS POLICIES FOR FELLOWSHIP_APPLICATIONS
-- ============================================================================

-- Users can view their own fellowship applications
CREATE POLICY "Users can view own fellowship applications"
  ON fellowship_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all fellowship applications
CREATE POLICY "Admins can view all fellowship applications"
  ON fellowship_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can insert their own fellowship applications
CREATE POLICY "Users can insert own fellowship applications"
  ON fellowship_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending applications
CREATE POLICY "Users can update own pending fellowship applications"
  ON fellowship_applications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Admins can update all fellowship applications
CREATE POLICY "Admins can update fellowship applications"
  ON fellowship_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 12. RLS POLICIES FOR STUDENT_MEMBERSHIPS
-- ============================================================================

-- Users can view their own student membership
CREATE POLICY "Users can view own student membership"
  ON student_memberships FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all student memberships
CREATE POLICY "Admins can view all student memberships"
  ON student_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can insert their own student membership
CREATE POLICY "Users can insert own student membership"
  ON student_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending student membership
CREATE POLICY "Users can update own pending student membership"
  ON student_memberships FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Admins can update all student memberships
CREATE POLICY "Admins can update student memberships"
  ON student_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 13. RLS POLICIES FOR COURSE_COMPLETION_RECORDS
-- ============================================================================

-- Users can view their own course completion records
CREATE POLICY "Users can view own course completion records"
  ON course_completion_records FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all course completion records
CREATE POLICY "Admins can view all course completion records"
  ON course_completion_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only system can insert course completion records
CREATE POLICY "System can insert course completion records"
  ON course_completion_records FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 14. MIGRATE EXISTING USERS TO MULTI-TRACK SYSTEM
-- ============================================================================

-- Initialize arbitration track for existing users based on current_level
INSERT INTO track_progress (user_id, track, level, pathway)
SELECT 
  id as user_id,
  'ARBITRATION' as track,
  current_level as level,
  pathway_type as pathway
FROM users
WHERE current_level IS NOT NULL
ON CONFLICT (user_id, track) DO NOTHING;

-- Initialize mediation track as NONE for all existing users
INSERT INTO track_progress (user_id, track, level)
SELECT 
  id as user_id,
  'MEDIATION' as track,
  'NONE' as level
FROM users
ON CONFLICT (user_id, track) DO NOTHING;

-- ============================================================================
-- 15. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE track_progress IS 'Stores track-specific qualification progression for Arbitration and Mediation tracks';
COMMENT ON TABLE certificates IS 'Stores issued certificates with track, level, pathway, and verification information';
COMMENT ON TABLE fellowship_applications IS 'Stores fellowship applications separate from expedited member applications';
COMMENT ON TABLE student_memberships IS 'Tracks student membership applications and verification status';
COMMENT ON TABLE course_completion_records IS 'Tracks course completions with assessment results and certificate linkage';

COMMENT ON COLUMN track_progress.track IS 'Qualification track: ARBITRATION or MEDIATION';
COMMENT ON COLUMN track_progress.level IS 'Qualification level: NONE, STUDENT, ASSOCIATE, MEMBER, or FELLOW';
COMMENT ON COLUMN track_progress.pathway IS 'Pathway type: STANDARD, EXPEDITED, or HYBRID (for mixed progression)';

COMMENT ON COLUMN certificates.track IS 'Track for this certificate: ARBITRATION or MEDIATION';
COMMENT ON COLUMN certificates.level IS 'Qualification level: ASSOCIATE, MEMBER, or FELLOW';
COMMENT ON COLUMN certificates.post_nominal IS 'Post-nominal letters: ACIMArb, MCIMArb, FCIMArb, ACIMed, MCIMed, FCIMed';
COMMENT ON COLUMN certificates.certificate_number IS 'Unique certificate identifier for verification';

COMMENT ON COLUMN fellowship_applications.track IS 'Track for fellowship application: ARBITRATION or MEDIATION';
COMMENT ON COLUMN fellowship_applications.portfolio_url IS 'URL to professional portfolio (required for fellowship)';
COMMENT ON COLUMN fellowship_applications.dissertation_url IS 'URL to submitted dissertation (required for fellowship)';

COMMENT ON COLUMN student_memberships.expires_at IS 'Date when student membership expires (typically 1-2 years)';
COMMENT ON COLUMN course_completion_records.is_supplementary IS 'True if this is a retake or additional training, not the primary completion';
