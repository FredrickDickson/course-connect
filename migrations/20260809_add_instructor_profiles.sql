-- Create instructor profiles table for detailed instructor information
CREATE TABLE IF NOT EXISTS instructor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  bio TEXT,
  title VARCHAR(255),
  expertise TEXT[],
  education TEXT,
  certifications TEXT,
  website_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  profile_image_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add admin tracking columns to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_edited_by_admin_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Create audit log for admin actions on behalf of instructors
CREATE TABLE IF NOT EXISTS admin_instructor_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id) NOT NULL,
  instructor_id UUID REFERENCES users(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON instructor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_by_admin ON courses(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_instructor_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_instructor_id ON admin_instructor_actions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_instructor_actions(created_at DESC);

-- Create updated_at trigger for instructor_profiles
CREATE OR REPLACE FUNCTION update_instructor_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_instructor_profile_timestamp
  BEFORE UPDATE ON instructor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_profile_updated_at();

-- Grant permissions (adjust based on your setup)
GRANT SELECT, INSERT, UPDATE ON instructor_profiles TO authenticated;
GRANT SELECT, INSERT ON admin_instructor_actions TO authenticated;
GRANT SELECT ON users TO authenticated;

-- Create RLS policies for instructor_profiles
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;

-- Instructors can view and edit their own profile
CREATE POLICY "Instructors can view own profile" 
  ON instructor_profiles FOR SELECT 
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Instructors can update own profile" 
  ON instructor_profiles FOR UPDATE 
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Instructors can insert own profile" 
  ON instructor_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Anyone can view published instructor profiles (for public pages)
CREATE POLICY "Public can view verified instructors" 
  ON instructor_profiles FOR SELECT 
  USING (is_verified = true);

-- RLS for admin_instructor_actions (admins only)
ALTER TABLE admin_instructor_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit log" 
  ON admin_instructor_actions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can insert audit log" 
  ON admin_instructor_actions FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Add helpful comment
COMMENT ON TABLE instructor_profiles IS 'Detailed profiles for instructors including bio, expertise, and credentials';
COMMENT ON TABLE admin_instructor_actions IS 'Audit log tracking admin actions performed on behalf of instructors';
COMMENT ON COLUMN courses.created_by_admin_id IS 'Admin user who created this course on behalf of instructor';
COMMENT ON COLUMN courses.last_edited_by_admin_id IS 'Admin user who last edited this course';
