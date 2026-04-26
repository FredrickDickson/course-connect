-- Professional Profiles & Waiver Infrastructure
-- Implements expedited qualification v2 schema described in expedited-qualification plan

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_review_status') THEN
    CREATE TYPE professional_review_status AS ENUM (
      'DRAFT',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'MORE_INFO_REQUIRED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'professional_document_type') THEN
    CREATE TYPE professional_document_type AS ENUM (
      'CV',
      'CERTIFICATE',
      'LICENSE',
      'PORTFOLIO',
      'REFERENCE',
      'AWARD',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'level_source_type') THEN
    CREATE TYPE level_source_type AS ENUM (
      'DEFAULT',
      'EXPEDITED',
      'ADMIN',
      'MIGRATION'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL DEFAULT 'ARBITRATION' CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT,
  timezone TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  organization TEXT,
  job_title TEXT,
  years_adr_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_adr_experience >= 0),
  years_legal_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_legal_experience >= 0),
  practice_areas TEXT[] NOT NULL DEFAULT '{}'::text[],
  adr_roles TEXT[] NOT NULL DEFAULT '{}'::text[],
  qualifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  credentials JSONB NOT NULL DEFAULT '[]'::jsonb,
  narrative_summary TEXT,
  self_assessed_level TEXT CHECK (self_assessed_level IS NULL OR self_assessed_level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  review_status professional_review_status NOT NULL DEFAULT 'DRAFT',
  review_notes TEXT,
  reviewer_id UUID REFERENCES users(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  decision_at TIMESTAMP WITH TIME ZONE,
  assigned_level TEXT NOT NULL DEFAULT 'NONE' CHECK (assigned_level IN ('NONE', 'ASSOCIATE', 'MEMBER', 'FELLOW')),
  level_source level_source_type NOT NULL DEFAULT 'DEFAULT',
  assigned_level_notes TEXT,
  submitted_payload JSONB,
  profile_version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, profile_version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_profiles_active_user
  ON professional_profiles(user_id)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_professional_profiles_review_status
  ON professional_profiles(review_status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS professional_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type professional_document_type NOT NULL,
  file_url TEXT NOT NULL,
  storage_path TEXT,
  original_name TEXT,
  mime_type TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED')),
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'REVIEWERS', 'ADMIN', 'PUBLIC')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  reviewer_id UUID REFERENCES users(id),
  review_notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_professional_documents_profile_id
  ON professional_documents(profile_id);

CREATE INDEX IF NOT EXISTS idx_professional_documents_type
  ON professional_documents(document_type);

CREATE TABLE IF NOT EXISTS level_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES professional_profiles(id) ON DELETE SET NULL,
  track TEXT NOT NULL CHECK (track IN ('ARBITRATION', 'MEDIATION')),
  level TEXT NOT NULL CHECK (level IN ('ASSOCIATE', 'MEMBER', 'FELLOW')),
  granted_via TEXT NOT NULL DEFAULT 'ADMIN' CHECK (granted_via IN ('ADMIN', 'EXPEDITED', 'LEGACY', 'AUTOMATION')),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMP WITH TIME ZONE,
  waiver_reason TEXT,
  status TEXT NOT NULL DEFAULT 'GRANTED' CHECK (status IN ('GRANTED', 'REVOKED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, track, level)
);

CREATE INDEX IF NOT EXISTS idx_level_waivers_user_track
  ON level_waivers(user_id, track);

-- Extend users table with assigned level source of truth
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_level TEXT DEFAULT 'NONE' CHECK (assigned_level IN ('NONE', 'ASSOCIATE', 'MEMBER', 'FELLOW')),
  ADD COLUMN IF NOT EXISTS level_source level_source_type DEFAULT 'DEFAULT'::level_source_type,
  ADD COLUMN IF NOT EXISTS level_updated_at TIMESTAMP WITH TIME ZONE;

-- Backfill assigned level metadata from existing columns
UPDATE users
SET assigned_level = COALESCE(NULLIF(current_level, ''), 'NONE'),
    level_updated_at = COALESCE(level_updated_at, timezone('utc', now())),
    level_source = COALESCE(
      level_source,
      CASE
        WHEN pathway_type = 'EXPEDITED' THEN 'EXPEDITED'
        WHEN pathway_type = 'HYBRID' THEN 'ADMIN'
        ELSE 'DEFAULT'
      END
    )
WHERE assigned_level IS NULL
   OR (assigned_level = 'NONE' AND current_level IS NOT NULL);

-- Track waived levels directly on user_track_progress for quick reads
ALTER TABLE user_track_progress
  ADD COLUMN IF NOT EXISTS waived_levels TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS waiver_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS waiver_last_granted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_track_progress
  DROP CONSTRAINT IF EXISTS user_track_progress_waived_levels_valid;

ALTER TABLE user_track_progress
  ADD CONSTRAINT user_track_progress_waived_levels_valid
  CHECK (waived_levels <@ ARRAY['ASSOCIATE', 'MEMBER', 'FELLOW']);

-- Updated at triggers
CREATE TRIGGER update_professional_profiles_updated_at
  BEFORE UPDATE ON professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_documents_updated_at
  BEFORE UPDATE ON professional_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_level_waivers_updated_at
  BEFORE UPDATE ON level_waivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS & policies for professional profiles
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own professional profile"
  ON professional_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own professional profile"
  ON professional_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage professional profiles"
  ON professional_profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  ));

CREATE POLICY "Users can view own professional documents"
  ON professional_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE professional_profiles.id = professional_documents.profile_id
        AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own pending professional documents"
  ON professional_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE professional_profiles.id = professional_documents.profile_id
        AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own professional documents"
  ON professional_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE professional_profiles.id = professional_documents.profile_id
        AND professional_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE professional_profiles.id = professional_documents.profile_id
        AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own professional documents"
  ON professional_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM professional_profiles
      WHERE professional_profiles.id = professional_documents.profile_id
        AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage professional documents"
  ON professional_documents FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  ));

CREATE POLICY "Users can view own level waivers"
  ON level_waivers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage level waivers"
  ON level_waivers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  ));

COMMENT ON TABLE professional_profiles IS 'Structured professional intake for expedited qualification reviews';
COMMENT ON TABLE professional_documents IS 'Supporting documents linked to professional profiles';
COMMENT ON TABLE level_waivers IS 'Records of level waivers granted when users are upgraded';
COMMENT ON COLUMN users.assigned_level IS 'Source of truth for eligibility decisions';
COMMENT ON COLUMN users.level_source IS 'Indicates whether level was assigned via default onboarding, expedited review, admin override, or migration';
COMMENT ON COLUMN users.level_updated_at IS 'Timestamp of the last assigned level change';
