-- Introduce Adjunct Courses as a second, independent kind of learning.
--
-- Professional Programme courses (Associate/Member/Fellow, ARBITRATION/MEDIATION)
-- keep their existing required `level`/`track` fields, unchanged behavior.
-- Adjunct Courses are standalone, Udemy/Coursera-style courses with no
-- prerequisites, no track, no qualification level, and no connection to the
-- CIMA professional membership pathway.

-- ============================================================
-- 1. Programme type discriminator on courses
-- ============================================================

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS programme_type TEXT NOT NULL DEFAULT 'PROFESSIONAL_PROGRAMME'
  CHECK (programme_type IN ('PROFESSIONAL_PROGRAMME', 'ADJUNCT_COURSE'));

COMMENT ON COLUMN public.courses.programme_type IS
  'PROFESSIONAL_PROGRAMME = part of the CIMA Associate/Member/Fellow ladder (requires level+track). ADJUNCT_COURSE = standalone certificate course, independent of the professional pathway (level/track are NULL).';

CREATE INDEX IF NOT EXISTS idx_courses_programme_type ON public.courses(programme_type);

-- Pre-check: every existing row must already have level/track populated
-- (guaranteed by their column DEFAULTs), so this CHECK is safe to add with
-- no backfill.
ALTER TABLE public.courses
  ADD CONSTRAINT courses_programme_type_fields_check
  CHECK (
    (programme_type = 'PROFESSIONAL_PROGRAMME' AND level IS NOT NULL AND track IS NOT NULL)
    OR
    (programme_type = 'ADJUNCT_COURSE')
  );

-- Document the pre-existing orphaned/duplicate column left by a migration
-- ordering drift (20260422000002_add_track_level_to_courses.sql vs.
-- 20260422000002_add_enrollment_types_and_pricing.sql). Not used anywhere
-- in application code; not touched by this migration.
COMMENT ON COLUMN public.courses.qualification_level IS
  'DEPRECATED/UNUSED - orphaned duplicate of level, created by a migration-ordering drift. Do not use; scheduled for removal in a future cleanup migration.';

-- ============================================================
-- 2. Onboarding path routing signal on users
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_path TEXT
  CHECK (onboarding_path IN ('PROFESSIONAL_PROGRAMME', 'ADJUNCT_COURSE'));

COMMENT ON COLUMN public.users.onboarding_path IS
  'Records the learning path the user chose at onboarding (Step 0). NULL = legacy user from before this feature, treated as PROFESSIONAL_PROGRAMME by the auth guard. This is a one-time routing signal, not a lock - a user can pick ADJUNCT_COURSE here and still later acquire a professional_profiles row via the "start Professional Programme" flow. Actual professional-pathway status is always derived live from professional_profiles, never from this column.';
