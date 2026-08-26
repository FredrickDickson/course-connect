-- ============================================================================
-- FINAL FIX: Add session_id columns and setup for live sessions
-- ============================================================================

-- Step 1: Add columns
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE;

ALTER TABLE course_resources
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_assignments_session ON assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_course_resources_session ON course_resources(session_id);

-- Step 3: Drop old constraints
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_parent_check;
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_one_anchor;
ALTER TABLE course_resources DROP CONSTRAINT IF EXISTS course_resources_parent_check;

-- Step 4: Add new constraints
ALTER TABLE assignments
ADD CONSTRAINT assignments_parent_check 
CHECK (
  (lesson_id IS NOT NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND session_id IS NOT NULL)
);

ALTER TABLE course_resources
ADD CONSTRAINT course_resources_parent_check
CHECK (
  (lesson_id IS NOT NULL AND course_id IS NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND course_id IS NOT NULL AND session_id IS NULL) OR
  (lesson_id IS NULL AND course_id IS NULL AND session_id IS NOT NULL)
);

-- Step 5: Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-resources', 'session-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Step 6: Storage policies
DROP POLICY IF EXISTS "session_resources_read" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_upload" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_update" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_delete" ON storage.objects;

CREATE POLICY "session_resources_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'session-resources');

CREATE POLICY "session_resources_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'session-resources' AND auth.uid() IS NOT NULL);

CREATE POLICY "session_resources_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'session-resources' AND auth.uid() IS NOT NULL);

CREATE POLICY "session_resources_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'session-resources' AND auth.uid() IS NOT NULL);

-- Step 7: Assignment RLS policies (SIMPLIFIED - no role checks)
DROP POLICY IF EXISTS "assignments_select_enrolled_or_session" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_owner_or_session" ON assignments;
DROP POLICY IF EXISTS "assignments_update_owner_or_session" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_owner_or_session" ON assignments;

-- Select: Can view if registered for session OR is the instructor OR lesson-based
CREATE POLICY "assignments_select_enrolled_or_session"
  ON assignments FOR SELECT
  USING (
    lesson_id IS NOT NULL OR
    (session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM session_participants 
        WHERE session_participants.session_id = assignments.session_id 
        AND session_participants.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM live_sessions 
        WHERE live_sessions.id = assignments.session_id 
        AND live_sessions.instructor_id = auth.uid()
      )
    ))
  );

-- Insert: Can create if lesson-based OR if instructor of the session
CREATE POLICY "assignments_insert_owner_or_session"
  ON assignments FOR INSERT
  WITH CHECK (
    lesson_id IS NOT NULL OR
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions 
      WHERE live_sessions.id = assignments.session_id 
      AND live_sessions.instructor_id = auth.uid()
    ))
  );

-- Update: Same as insert
CREATE POLICY "assignments_update_owner_or_session"
  ON assignments FOR UPDATE
  USING (
    lesson_id IS NOT NULL OR
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions 
      WHERE live_sessions.id = assignments.session_id 
      AND live_sessions.instructor_id = auth.uid()
    ))
  );

-- Delete: Same as insert
CREATE POLICY "assignments_delete_owner_or_session"
  ON assignments FOR DELETE
  USING (
    lesson_id IS NOT NULL OR
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions 
      WHERE live_sessions.id = assignments.session_id 
      AND live_sessions.instructor_id = auth.uid()
    ))
  );

-- Step 8: Resource RLS policies (SIMPLIFIED - no role checks)
DROP POLICY IF EXISTS "course_resources_select_session" ON course_resources;
DROP POLICY IF EXISTS "course_resources_manage_session" ON course_resources;

-- Select: Can view if lesson/course based OR registered for session OR instructor OR public
CREATE POLICY "course_resources_select_session"
  ON course_resources FOR SELECT
  USING (
    lesson_id IS NOT NULL OR 
    course_id IS NOT NULL OR
    (session_id IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM session_participants 
        WHERE session_participants.session_id = course_resources.session_id 
        AND session_participants.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM live_sessions 
        WHERE live_sessions.id = course_resources.session_id 
        AND (live_sessions.instructor_id = auth.uid() OR live_sessions.is_public = true)
      )
    ))
  );

-- Manage (INSERT/UPDATE/DELETE): Can manage if instructor of the session
CREATE POLICY "course_resources_manage_session"
  ON course_resources FOR ALL
  USING (
    session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions 
      WHERE live_sessions.id = course_resources.session_id 
      AND live_sessions.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM live_sessions 
      WHERE live_sessions.id = course_resources.session_id 
      AND live_sessions.instructor_id = auth.uid()
    )
  );

-- Success message
SELECT 'SUCCESS! Database is ready for session assignments and resources!' as status;
