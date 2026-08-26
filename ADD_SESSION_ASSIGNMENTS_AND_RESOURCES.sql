-- ============================================================================
-- ADD ASSIGNMENTS AND RESOURCES TO LIVE SESSIONS
-- ============================================================================
-- This migration adds the ability to attach assignments and resources directly
-- to live sessions, independent of course lessons.

-- ============================================================================
-- 1. ADD session_id TO assignments TABLE
-- ============================================================================
-- Allow assignments to be attached to either a lesson OR a session
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_session ON assignments(session_id);

-- Update constraint: assignment must have either lesson_id OR session_id (not both)
ALTER TABLE assignments 
DROP CONSTRAINT IF EXISTS assignments_parent_check;
ALTER TABLE assignments
DROP CONSTRAINT IF EXISTS assignments_one_anchor;

ALTER TABLE assignments
ADD CONSTRAINT assignments_parent_check 
CHECK (
  (lesson_id IS NOT NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND session_id IS NOT NULL)
);

COMMENT ON COLUMN assignments.session_id IS 'Link to live session (mutually exclusive with lesson_id)';

-- ============================================================================
-- 2. ADD session_id TO course_resources TABLE
-- ============================================================================
-- Allow resources to be attached to lessons, courses, OR sessions
ALTER TABLE course_resources
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_course_resources_session ON course_resources(session_id);

-- Update constraint: resource must have lesson_id, course_id, OR session_id
ALTER TABLE course_resources
DROP CONSTRAINT IF EXISTS course_resources_parent_check;

ALTER TABLE course_resources
ADD CONSTRAINT course_resources_parent_check
CHECK (
  (lesson_id IS NOT NULL AND course_id IS NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND course_id IS NOT NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND course_id IS NULL AND session_id IS NOT NULL)
);

COMMENT ON COLUMN course_resources.session_id IS 'Link to live session (mutually exclusive with lesson_id and course_id)';

-- ============================================================================
-- 3. CREATE STORAGE BUCKET FOR SESSION RESOURCES
-- ============================================================================
-- The API uploads files to this bucket before saving their metadata.
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-resources', 'session-resources', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR ASSIGNMENTS
-- ============================================================================
-- Allow viewing session assignments if user is registered for the session
DROP POLICY IF EXISTS "assignments_select_enrolled_or_session" ON assignments;
CREATE POLICY "assignments_select_enrolled_or_session"
  ON assignments FOR SELECT
  USING (
    -- Original lesson-based access
    (lesson_id IS NOT NULL AND public.user_can_view_lesson(lesson_id, auth.uid()))
    OR
    -- New session-based access: registered for session OR instructor/admin
    (session_id IS NOT NULL AND (
      -- User is registered for the session
      EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_participants.session_id = assignments.session_id
          AND session_participants.user_id = auth.uid()::text
      )
      OR
      -- User is the session instructor
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = assignments.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR
      -- User is admin
      public.is_admin(auth.uid()::text)
    ))
  );

-- Allow instructors/admins to create assignments for their sessions
DROP POLICY IF EXISTS "assignments_insert_owner_or_session" ON assignments;
CREATE POLICY "assignments_insert_owner_or_session"
  ON assignments FOR INSERT
  WITH CHECK (
    -- Original lesson-based access
    (lesson_id IS NOT NULL AND (
      public.user_owns_lesson(lesson_id, auth.uid()) 
      OR public.is_admin(auth.uid()::text)
    ))
    OR
    -- New session-based access
    (session_id IS NOT NULL AND (
      -- User is the session instructor
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = assignments.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR
      -- User is admin
      public.is_admin(auth.uid()::text)
    ))
  );

-- Allow instructors/admins to update assignments for their sessions
DROP POLICY IF EXISTS "assignments_update_owner_or_session" ON assignments;
CREATE POLICY "assignments_update_owner_or_session"
  ON assignments FOR UPDATE
  USING (
    -- Original lesson-based access
    (lesson_id IS NOT NULL AND (
      public.user_owns_lesson(lesson_id, auth.uid()) 
      OR public.is_admin(auth.uid()::text)
    ))
    OR
    -- New session-based access
    (session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = assignments.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR
      public.is_admin(auth.uid()::text)
    ))
  );

-- Allow instructors/admins to delete assignments for their sessions
DROP POLICY IF EXISTS "assignments_delete_owner_or_session" ON assignments;
CREATE POLICY "assignments_delete_owner_or_session"
  ON assignments FOR DELETE
  USING (
    -- Original lesson-based access
    (lesson_id IS NOT NULL AND (
      public.user_owns_lesson(lesson_id, auth.uid()) 
      OR public.is_admin(auth.uid()::text)
    ))
    OR
    -- New session-based access
    (session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = assignments.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR
      public.is_admin(auth.uid()::text)
    ))
  );

-- ============================================================================
-- 5. UPDATE RLS POLICIES FOR RESOURCES
-- ============================================================================
-- Allow viewing session resources if user is registered for the session
DROP POLICY IF EXISTS "course_resources_select_session" ON course_resources;
CREATE POLICY "course_resources_select_session"
  ON course_resources FOR SELECT
  USING (
    -- Session-based resource access
    (session_id IS NOT NULL AND (
      -- User is registered for the session
      EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_participants.session_id = course_resources.session_id
          AND session_participants.user_id = auth.uid()::text
      )
      OR
      -- User is the session instructor
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR
      -- User is admin
      public.is_admin(auth.uid()::text)
      OR
      -- Session is public
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND live_sessions.is_public = true
      )
    ))
    OR
    -- Original course/lesson-based access (keep existing policies)
    (lesson_id IS NOT NULL OR course_id IS NOT NULL)
  );

-- Allow instructors/admins to manage session resources
DROP POLICY IF EXISTS "course_resources_manage_session" ON course_resources;
CREATE POLICY "course_resources_manage_session"
  ON course_resources FOR ALL
  USING (
    session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR public.is_admin(auth.uid()::text)
    )
  )
  WITH CHECK (
    session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND live_sessions.instructor_id = auth.uid()::text
      )
      OR public.is_admin(auth.uid()::text)
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration

-- Check assignments table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assignments'
  AND column_name IN ('lesson_id', 'session_id');

-- Check course_resources table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_resources'
  AND column_name IN ('lesson_id', 'course_id', 'session_id');

-- Check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'assignments'::regclass
  AND conname LIKE '%check%';

SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'course_resources'::regclass
  AND conname LIKE '%check%';
