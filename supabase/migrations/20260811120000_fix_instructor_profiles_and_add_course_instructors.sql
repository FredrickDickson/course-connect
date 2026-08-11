-- Recreates what migrations/20260809_add_instructor_profiles.sql intended.
-- That migration was never successfully applied: it defined `user_id UUID
-- REFERENCES users(id)` / `created_by_admin_id UUID REFERENCES users(id)`,
-- but users.id is actually `character varying` — an incompatible FK type,
-- so the whole migration failed and none of it exists live. This migration
-- redoes it with the correct types, plus the new pieces for multi-instructor
-- course crediting.

CREATE TABLE IF NOT EXISTS instructor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id character varying REFERENCES users(id) UNIQUE NOT NULL,
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

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS created_by_admin_id character varying REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_edited_by_admin_id character varying REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS admin_instructor_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id character varying REFERENCES users(id) NOT NULL,
  instructor_id character varying REFERENCES users(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marks a user row as admin-managed (created via the admin course-creation
-- "add instructor" flow, no real login of their own) — safe to keep syncing
-- bio/photo from admin course forms. NULL means a real self-managed
-- account: never overwrite users.bio / profiles.avatar_url for them from a
-- course form again.
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_admin_id character varying REFERENCES users(id);

-- Public crediting join table. courses.instructor_id remains the sole
-- "owner" used by every existing permission check; this table is only for
-- public display of co-instructors.
CREATE TABLE IF NOT EXISTS course_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id character varying NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT course_instructors_course_user_unique UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_created_by_admin_id ON users(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_by_admin ON courses(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON instructor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_instructor_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_instructor_id ON admin_instructor_actions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_course_id ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_user_id ON course_instructors(user_id);

CREATE OR REPLACE FUNCTION update_instructor_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_instructor_profile_timestamp ON instructor_profiles;
CREATE TRIGGER trigger_update_instructor_profile_timestamp
  BEFORE UPDATE ON instructor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_profile_updated_at();

DROP TRIGGER IF EXISTS trigger_update_course_instructors_timestamp ON course_instructors;
CREATE TRIGGER trigger_update_course_instructors_timestamp
  BEFORE UPDATE ON course_instructors
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_profile_updated_at();

-- ============================================================
-- RLS: instructor_profiles (same policies as originally intended)
-- ============================================================
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can view own profile" ON instructor_profiles;
CREATE POLICY "Instructors can view own profile"
  ON instructor_profiles FOR SELECT
  USING (auth.uid()::text = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Instructors can update own profile" ON instructor_profiles;
CREATE POLICY "Instructors can update own profile"
  ON instructor_profiles FOR UPDATE
  USING (auth.uid()::text = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Instructors can insert own profile" ON instructor_profiles;
CREATE POLICY "Instructors can insert own profile"
  ON instructor_profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Public can view verified instructors" ON instructor_profiles;
CREATE POLICY "Public can view verified instructors"
  ON instructor_profiles FOR SELECT
  USING (is_verified = true);

-- ============================================================
-- RLS: admin_instructor_actions (admins only)
-- ============================================================
ALTER TABLE admin_instructor_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view audit log" ON admin_instructor_actions;
CREATE POLICY "Only admins can view audit log"
  ON admin_instructor_actions FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'));

DROP POLICY IF EXISTS "Only admins can insert audit log" ON admin_instructor_actions;
CREATE POLICY "Only admins can insert audit log"
  ON admin_instructor_actions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'));

-- ============================================================
-- RLS: course_instructors — public SELECT when the course is published
-- (same visibility as courses themselves, since course-detail.tsx is
-- viewed by anonymous visitors); writes restricted to the course's owner
-- or admins. Actual writes in this app always go through the service-role
-- key server-side (bypasses RLS) — these policies are defense-in-depth.
-- ============================================================
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_instructors_view_published_courses" ON course_instructors;
CREATE POLICY "course_instructors_view_published_courses"
  ON course_instructors FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_instructors.course_id AND c.is_published = true)
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_instructors.course_id AND c.instructor_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "course_instructors_owner_admin_insert" ON course_instructors;
CREATE POLICY "course_instructors_owner_admin_insert"
  ON course_instructors FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "course_instructors_owner_admin_update" ON course_instructors;
CREATE POLICY "course_instructors_owner_admin_update"
  ON course_instructors FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "course_instructors_owner_admin_delete" ON course_instructors;
CREATE POLICY "course_instructors_owner_admin_delete"
  ON course_instructors FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND u.role = 'admin')
  );

COMMENT ON TABLE instructor_profiles IS 'Detailed profiles for instructors including bio, expertise, and credentials';
COMMENT ON TABLE admin_instructor_actions IS 'Audit log tracking admin actions performed on behalf of instructors';
COMMENT ON TABLE course_instructors IS 'Public crediting of multiple instructors per course. courses.instructor_id remains the sole owner for permission checks; this table is display-only.';
COMMENT ON COLUMN courses.created_by_admin_id IS 'Admin user who created this course on behalf of instructor';
COMMENT ON COLUMN courses.last_edited_by_admin_id IS 'Admin user who last edited this course';
COMMENT ON COLUMN users.created_by_admin_id IS 'If set, this user row was created by an admin via the course-creation "add instructor" flow rather than self-registering. Bio/photo/name are safe to keep syncing from admin course forms. NULL means a real self-managed account.';
