-- Add arbitration/mediation pathway tracking to support ACIMArb and ACIMed post-nominals
-- This migration adds pathway-specific fields to support the dual qualification system

-- Add pathway column to courses table for explicit pathway tracking
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS pathway TEXT CHECK (pathway IN ('arbitration', 'mediation', 'both', 'general')),
ADD COLUMN IF NOT EXISTS pathway_tags TEXT[] DEFAULT '{}';

-- Add pathway column to enrollments table to track user's pathway for each enrollment
ALTER TABLE course_enrollments 
ADD COLUMN IF NOT EXISTS pathway TEXT CHECK (pathway IN ('arbitration', 'mediation', 'both', 'general')),
ADD COLUMN IF NOT EXISTS pathway_detected_at TIMESTAMP WITH TIME ZONE;

-- Add pathway tracking to members table for current active pathway
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS primary_pathway TEXT CHECK (primary_pathway IN ('arbitration', 'mediation', 'both', 'general')),
ADD COLUMN IF NOT EXISTS pathway_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pathway_confirmed_by UUID REFERENCES users(id);

-- Create pathway_progress table to track user progress across both pathways
CREATE TABLE IF NOT EXISTS pathway_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pathway TEXT NOT NULL CHECK (pathway IN ('arbitration', 'mediation')),
  current_level TEXT NOT NULL CHECK (current_level IN ('associate', 'member', 'fellow')),
  progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  courses_completed TEXT[] DEFAULT '{}',
  total_courses_required INTEGER DEFAULT 0,
  next_level_requirements JSONB DEFAULT '{}',
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pathway_certificates table to track certificates issued for each pathway
CREATE TABLE IF NOT EXISTS pathway_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pathway TEXT NOT NULL CHECK (pathway IN ('arbitration', 'mediation')),
  level TEXT NOT NULL CHECK (level IN ('associate', 'member', 'fellow')),
  post_nominal TEXT NOT NULL,
  certificate_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  issuer_id UUID REFERENCES users(id),
  verification_code TEXT UNIQUE,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_pathway ON courses(pathway);
CREATE INDEX IF NOT EXISTS idx_courses_pathway_tags ON courses USING GIN(pathway_tags);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_pathway ON course_enrollments(pathway);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_pathway ON course_enrollments(user_id, pathway);
CREATE INDEX IF NOT EXISTS idx_members_primary_pathway ON members(primary_pathway);
CREATE INDEX IF NOT EXISTS idx_pathway_progress_user_pathway ON pathway_progress(user_id, pathway);
CREATE INDEX IF NOT EXISTS idx_pathway_progress_user_level ON pathway_progress(user_id, current_level);
CREATE INDEX IF NOT EXISTS idx_pathway_certificates_user_pathway ON pathway_certificates(user_id, pathway);
CREATE INDEX IF NOT EXISTS idx_pathway_certificates_verification_code ON pathway_certificates(verification_code);

-- Add updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_pathway_certificates_updated_at
  BEFORE UPDATE ON pathway_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE pathway_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pathway_progress
-- Users can view their own pathway progress
CREATE POLICY "Users can view own pathway progress"
  ON pathway_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all pathway progress
CREATE POLICY "Admins can view all pathway progress"
  ON pathway_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can insert pathway progress (for enrollment completion)
CREATE POLICY "System can insert pathway progress"
  ON pathway_progress FOR INSERT
  WITH CHECK (true);

-- Users can update their own pathway progress
CREATE POLICY "Users can update own pathway progress"
  ON pathway_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update all pathway progress
CREATE POLICY "Admins can update pathway progress"
  ON pathway_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for pathway_certificates
-- Users can view their own certificates
CREATE POLICY "Users can view own pathway certificates"
  ON pathway_certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Public can verify certificates by verification code
CREATE POLICY "Public can verify certificates"
  ON pathway_certificates FOR SELECT
  USING (verification_code IS NOT NULL AND is_revoked = FALSE);

-- Admins can view all certificates
CREATE POLICY "Admins can view all pathway certificates"
  ON pathway_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- System can insert certificates (for course completion)
CREATE POLICY "System can insert pathway certificates"
  ON pathway_certificates FOR INSERT
  WITH CHECK (true);

-- Admins can update certificates
CREATE POLICY "Admins can update pathway certificates"
  ON pathway_certificates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create function to automatically detect and update pathway for enrollments
CREATE OR REPLACE FUNCTION detect_and_update_enrollment_pathway()
RETURNS TRIGGER AS $$
BEGIN
  -- Detect pathway based on course title and tags
  IF NEW.course_id IS NOT NULL THEN
    -- Get course details
    DECLARE
      course_title TEXT;
      course_tags TEXT[];
      detected_pathway TEXT;
    BEGIN
      SELECT c.title, c.tags INTO course_title, course_tags
      FROM courses c
      WHERE c.id = NEW.course_id;
      
      -- Simple pathway detection logic
      IF course_tags && ARRAY['mediation'] IS NOT NULL OR 
         LOWER(course_title) LIKE '%mediation%' THEN
        detected_pathway := 'mediation';
      ELSIF course_tags && ARRAY['arbitration'] IS NOT NULL OR 
             LOWER(course_title) LIKE '%arbitration%' THEN
        detected_pathway := 'arbitration';
      ELSE
        detected_pathway := 'general';
      END IF;
      
      -- Update the enrollment with detected pathway
      NEW.pathway := detected_pathway;
      NEW.pathway_detected_at := NOW();
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically detect pathway on enrollment
CREATE TRIGGER detect_enrollment_pathway
  BEFORE INSERT OR UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION detect_and_update_enrollment_pathway();

-- Create function to update user's primary pathway based on enrollments
CREATE OR REPLACE FUNCTION update_user_primary_pathway(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  arbitration_count INTEGER;
  mediation_count INTEGER;
  new_primary_pathway TEXT;
BEGIN
  -- Count enrollments by pathway
  SELECT COUNT(*) INTO arbitration_count
  FROM course_enrollments
  WHERE user_id = user_uuid AND pathway = 'arbitration' AND status = 'ACTIVE';
  
  SELECT COUNT(*) INTO mediation_count
  FROM course_enrollments
  WHERE user_id = user_uuid AND pathway = 'mediation' AND status = 'ACTIVE';
  
  -- Determine primary pathway
  IF mediation_count > arbitration_count THEN
    new_primary_pathway := 'mediation';
  ELSIF arbitration_count > mediation_count THEN
    new_primary_pathway := 'arbitration';
  ELSIF arbitration_count > 0 OR mediation_count > 0 THEN
    new_primary_pathway := 'both';
  ELSE
    new_primary_pathway := 'general';
  END IF;
  
  -- Update members table if different
  UPDATE members
  SET primary_pathway = new_primary_pathway,
      pathway_confirmed_at = NOW()
  WHERE user_id = user_uuid 
    AND (primary_pathway IS NULL OR primary_pathway != new_primary_pathway);
END;
$$ LANGUAGE plpgsql;

-- Create function to generate verification codes for certificates
CREATE OR REPLACE FUNCTION generate_certificate_verification_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT[] := ARRAY['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z'];
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 8-character verification code
  FOR i IN 1..8 LOOP
    result := result || chars[1 + floor(random() * array_length(chars, 1))];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate verification codes
CREATE OR REPLACE FUNCTION auto_generate_certificate_verification_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := generate_certificate_verification_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_certificate_verification_code
  BEFORE INSERT ON pathway_certificates
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_certificate_verification_code();

-- Add comments for documentation
COMMENT ON COLUMN courses.pathway IS 'Primary pathway: arbitration, mediation, both, or general';
COMMENT ON COLUMN courses.pathway_tags IS 'Array of pathway-specific tags for better filtering';
COMMENT ON COLUMN course_enrollments.pathway IS 'Detected pathway for this enrollment';
COMMENT ON COLUMN course_enrollments.pathway_detected_at IS 'When the pathway was automatically detected';
COMMENT ON COLUMN members.primary_pathway IS 'User primary qualification pathway';
COMMENT ON COLUMN members.pathway_confirmed_at IS 'When the pathway was confirmed';
COMMENT ON COLUMN members.pathway_confirmed_by IS 'Admin who confirmed the pathway';
COMMENT ON TABLE pathway_progress IS 'Tracks user progress through arbitration and mediation pathways';
COMMENT ON TABLE pathway_certificates IS 'Stores certificates issued for specific pathways and levels';

-- Create view for pathway analytics
CREATE OR REPLACE VIEW pathway_analytics AS
SELECT 
  p.pathway,
  p.current_level,
  COUNT(*) as user_count,
  AVG(p.progress_percentage) as avg_progress,
  COUNT(DISTINCT pc.id) as certificates_issued
FROM pathway_progress p
LEFT JOIN pathway_certificates pc ON p.user_id = pc.user_id AND pc.pathway = p.pathway
GROUP BY p.pathway, p.current_level
ORDER BY p.pathway, p.current_level;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON pathway_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION generate_certificate_verification_code() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_primary_pathway(UUID) TO authenticated;
