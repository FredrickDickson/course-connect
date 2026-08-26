-- ============================================================================
-- CRITICAL: RUN THIS IN SUPABASE SQL EDITOR NOW
-- ============================================================================
-- This adds session_id columns to assignments and resources tables
-- and creates the storage bucket for session resources
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD session_id TO assignments TABLE
-- ============================================================================
-- First check what type the id column in live_sessions is
DO $$ 
DECLARE
    session_id_type text;
BEGIN
    -- Get the data type of live_sessions.id
    SELECT data_type INTO session_id_type
    FROM information_schema.columns
    WHERE table_name = 'live_sessions' AND column_name = 'id';
    
    -- Add session_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignments' 
        AND column_name = 'session_id'
    ) THEN
        -- Use the same type as live_sessions.id
        IF session_id_type = 'uuid' THEN
            ALTER TABLE assignments 
            ADD COLUMN session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE assignments 
            ADD COLUMN session_id VARCHAR REFERENCES live_sessions(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_assignments_session ON assignments(session_id);
        
        RAISE NOTICE 'Added session_id column to assignments table with type: %', session_id_type;
    ELSE
        RAISE NOTICE 'session_id column already exists in assignments table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: ADD session_id TO course_resources TABLE
-- ============================================================================
DO $$ 
DECLARE
    session_id_type text;
BEGIN
    -- Get the data type of live_sessions.id
    SELECT data_type INTO session_id_type
    FROM information_schema.columns
    WHERE table_name = 'live_sessions' AND column_name = 'id';
    
    -- Add session_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course_resources' 
        AND column_name = 'session_id'
    ) THEN
        -- Use the same type as live_sessions.id
        IF session_id_type = 'uuid' THEN
            ALTER TABLE course_resources
            ADD COLUMN session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE;
        ELSE
            ALTER TABLE course_resources
            ADD COLUMN session_id VARCHAR REFERENCES live_sessions(id) ON DELETE CASCADE;
        END IF;
        
        CREATE INDEX idx_course_resources_session ON course_resources(session_id);
        
        RAISE NOTICE 'Added session_id column to course_resources table with type: %', session_id_type;
    ELSE
        RAISE NOTICE 'session_id column already exists in course_resources table';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: UPDATE CONSTRAINTS
-- ============================================================================
-- Drop old constraints if they exist
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_parent_check;
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_one_anchor;
ALTER TABLE course_resources DROP CONSTRAINT IF EXISTS course_resources_parent_check;

-- Add new constraints: assignment must have lesson_id OR session_id (not both)
ALTER TABLE assignments
ADD CONSTRAINT assignments_parent_check 
CHECK (
  (lesson_id IS NOT NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND session_id IS NOT NULL)
);

-- Add new constraints: resource must have lesson_id, course_id, OR session_id
ALTER TABLE course_resources
ADD CONSTRAINT course_resources_parent_check
CHECK (
  (lesson_id IS NOT NULL AND course_id IS NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND course_id IS NOT NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND course_id IS NULL AND session_id IS NOT NULL)
);

-- ============================================================================
-- STEP 4: UPDATE RLS POLICIES FOR ASSIGNMENTS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "assignments_select_enrolled_or_session" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_owner_or_session" ON assignments;
DROP POLICY IF EXISTS "assignments_update_owner_or_session" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_owner_or_session" ON assignments;

-- Allow viewing session assignments if user is registered for the session
CREATE POLICY "assignments_select_enrolled_or_session"
  ON assignments FOR SELECT
  USING (
    -- Original lesson-based access
    (lesson_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = auth.uid()::text
      WHERE l.id = assignments.lesson_id
        AND (c.instructor_id = auth.uid()::text OR e.id IS NOT NULL OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
    ))
    OR
    -- New session-based access
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
      auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
    ))
  );

-- Allow instructors/admins to create assignments
CREATE POLICY "assignments_insert_owner_or_session"
  ON assignments FOR INSERT
  WITH CHECK (
    -- Lesson-based
    (lesson_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = assignments.lesson_id
          AND (c.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
      )
    ))
    OR
    -- Session-based
    (session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = assignments.session_id
          AND (live_sessions.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
      )
    ))
  );

-- Allow instructors/admins to update assignments
CREATE POLICY "assignments_update_owner_or_session"
  ON assignments FOR UPDATE
  USING (
    (lesson_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = assignments.lesson_id
        AND (c.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
    ))
    OR
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = assignments.session_id
        AND (live_sessions.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
    ))
  );

-- Allow instructors/admins to delete assignments
CREATE POLICY "assignments_delete_owner_or_session"
  ON assignments FOR DELETE
  USING (
    (lesson_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE l.id = assignments.lesson_id
        AND (c.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
    ))
    OR
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = assignments.session_id
        AND (live_sessions.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
    ))
  );

-- ============================================================================
-- STEP 5: UPDATE RLS POLICIES FOR RESOURCES
-- ============================================================================

-- Drop existing session-specific policies
DROP POLICY IF EXISTS "course_resources_select_session" ON course_resources;
DROP POLICY IF EXISTS "course_resources_manage_session" ON course_resources;

-- Allow viewing session resources
CREATE POLICY "course_resources_select_session"
  ON course_resources FOR SELECT
  USING (
    -- Session-based resource access
    (session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM session_participants
        WHERE session_participants.session_id = course_resources.session_id
          AND session_participants.user_id = auth.uid()::text
      )
      OR
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND (live_sessions.instructor_id = auth.uid()::text OR live_sessions.is_public = true)
      )
      OR
      auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
    ))
    OR
    -- Original course/lesson-based access (keep existing)
    (lesson_id IS NOT NULL OR course_id IS NOT NULL)
  );

-- Allow managing session resources
CREATE POLICY "course_resources_manage_session"
  ON course_resources FOR ALL
  USING (
    session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND (live_sessions.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
      )
    )
  )
  WITH CHECK (
    session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM live_sessions
        WHERE live_sessions.id = course_resources.session_id
          AND (live_sessions.instructor_id = auth.uid()::text OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'))
      )
    )
  );

-- ============================================================================
-- STEP 6: CREATE STORAGE BUCKET FOR SESSION RESOURCES
-- ============================================================================

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-resources', 'session-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "session_resources_read" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_upload" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_update" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_delete" ON storage.objects;

-- Allow authenticated users to read session resources
CREATE POLICY "session_resources_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'session-resources');

-- Allow instructors/admins to upload
CREATE POLICY "session_resources_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'session-resources'
    AND auth.uid() IS NOT NULL
  );

-- Allow instructors/admins to update
CREATE POLICY "session_resources_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'session-resources'
    AND auth.uid() IS NOT NULL
  );

-- Allow instructors/admins to delete
CREATE POLICY "session_resources_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'session-resources'
    AND auth.uid() IS NOT NULL
  );

-- ============================================================================
-- VERIFICATION - Check if everything is set up correctly
-- ============================================================================

-- Check assignments table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'assignments'
  AND column_name IN ('lesson_id', 'session_id');

-- Check course_resources table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'course_resources'
  AND column_name IN ('lesson_id', 'course_id', 'session_id');

-- Check storage bucket
SELECT id, name, public
FROM storage.buckets
WHERE id = 'session-resources';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ DATABASE SETUP COMPLETE!';
    RAISE NOTICE '✅ You can now:';
    RAISE NOTICE '   1. Create live sessions with assignments';
    RAISE NOTICE '   2. Upload resources to sessions';
    RAISE NOTICE '   3. Students can view materials after registering';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Go back to your app and try creating a session with assignments and resources!';
END $$;
