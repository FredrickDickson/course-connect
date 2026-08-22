-- ============================================================================
-- LIVE SESSIONS FEATURE - Database Schema (FIXED VERSION)
-- ============================================================================
-- This version is compatible with existing CIMA Learn database schema

-- First, check what type your users.id column is
-- Run this query separately to see: SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id';

-- Live Sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session details
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT CHECK (session_type IN ('lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study')) DEFAULT 'lecture',
  
  -- Scheduling
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  timezone TEXT DEFAULT 'UTC',
  
  -- Zoom integration
  zoom_meeting_id TEXT UNIQUE,
  zoom_meeting_password TEXT,
  zoom_join_url TEXT,
  zoom_start_url TEXT,
  zoom_registration_url TEXT,
  
  -- Access control (using TEXT to match your users.id column type)
  instructor_id TEXT,
  course_id UUID,
  is_public BOOLEAN DEFAULT false,
  max_participants INTEGER,
  
  -- Status tracking
  status TEXT CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')) DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  
  -- Recording
  recording_url TEXT,
  recording_password TEXT,
  is_recording_available BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  -- Validation constraints
  CONSTRAINT valid_schedule CHECK (scheduled_end > scheduled_start),
  CONSTRAINT valid_max_duration CHECK (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60 <= 240)
);

-- Session participants/registrations
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Registration details
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registration_status TEXT CHECK (registration_status IN ('registered', 'attended', 'no_show', 'cancelled')) DEFAULT 'registered',
  
  -- Attendance tracking
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  attendance_duration_minutes INTEGER,
  
  -- Zoom participant data
  zoom_participant_id TEXT,
  zoom_registrant_id TEXT,
  
  -- Notifications
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One registration per user per session
  UNIQUE(session_id, user_id)
);

-- Session reminders/notifications queue
CREATE TABLE IF NOT EXISTS session_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id TEXT,
  
  notification_type TEXT CHECK (notification_type IN ('scheduled', 'reminder_24h', 'reminder_1h', 'starting_now', 'cancelled', 'recording_available')) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  
  -- Notification content
  title TEXT,
  message TEXT,
  notification_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints AFTER tables are created
ALTER TABLE live_sessions 
  DROP CONSTRAINT IF EXISTS live_sessions_instructor_id_fkey,
  ADD CONSTRAINT live_sessions_instructor_id_fkey 
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE live_sessions 
  DROP CONSTRAINT IF EXISTS live_sessions_course_id_fkey,
  ADD CONSTRAINT live_sessions_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE live_sessions 
  DROP CONSTRAINT IF EXISTS live_sessions_created_by_fkey,
  ADD CONSTRAINT live_sessions_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE session_participants 
  DROP CONSTRAINT IF EXISTS session_participants_session_id_fkey,
  ADD CONSTRAINT session_participants_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE;

ALTER TABLE session_participants 
  DROP CONSTRAINT IF EXISTS session_participants_user_id_fkey,
  ADD CONSTRAINT session_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE session_notifications 
  DROP CONSTRAINT IF EXISTS session_notifications_session_id_fkey,
  ADD CONSTRAINT session_notifications_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE;

ALTER TABLE session_notifications 
  DROP CONSTRAINT IF EXISTS session_notifications_user_id_fkey,
  ADD CONSTRAINT session_notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_instructor ON live_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled_start ON live_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_live_sessions_zoom_meeting_id ON live_sessions(zoom_meeting_id);

CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(registration_status);

CREATE INDEX IF NOT EXISTS idx_session_notifications_session ON session_notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notifications_user ON session_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notifications_scheduled ON session_notifications(scheduled_for) WHERE status = 'pending';

-- Row Level Security (RLS) Policies
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view public sessions" ON live_sessions;
DROP POLICY IF EXISTS "Instructors and admins can create sessions" ON live_sessions;
DROP POLICY IF EXISTS "Instructors can update own sessions, admins all" ON live_sessions;
DROP POLICY IF EXISTS "Instructors can delete own sessions, admins all" ON live_sessions;
DROP POLICY IF EXISTS "Users view own registrations, instructors view session registrations" ON session_participants;
DROP POLICY IF EXISTS "Users can register for sessions" ON session_participants;
DROP POLICY IF EXISTS "Users update own registrations" ON session_participants;
DROP POLICY IF EXISTS "Users can cancel own registrations" ON session_participants;
DROP POLICY IF EXISTS "Users view own notifications" ON session_notifications;
DROP POLICY IF EXISTS "Admins manage notifications" ON session_notifications;

-- RLS Policies for live_sessions
CREATE POLICY "Anyone can view public sessions"
  ON live_sessions FOR SELECT
  USING (
    is_public = true
    OR auth.uid()::text = instructor_id
    OR auth.uid()::text IN (SELECT id FROM users WHERE role IN ('admin'))
    OR (course_id IS NOT NULL AND auth.uid()::text IN (SELECT user_id FROM enrollments WHERE course_id = live_sessions.course_id AND status = 'ACTIVE'))
  );

CREATE POLICY "Instructors and admins can create sessions"
  ON live_sessions FOR INSERT
  WITH CHECK (
    auth.uid()::text IN (SELECT id FROM users WHERE role IN ('instructor', 'admin'))
  );

CREATE POLICY "Instructors can update own sessions, admins all"
  ON live_sessions FOR UPDATE
  USING (
    auth.uid()::text = instructor_id
    OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "Instructors can delete own sessions, admins all"
  ON live_sessions FOR DELETE
  USING (
    auth.uid()::text = instructor_id
    OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
  );

-- RLS Policies for session_participants
CREATE POLICY "Users view own registrations, instructors view session registrations"
  ON session_participants FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR auth.uid()::text IN (SELECT instructor_id FROM live_sessions WHERE id = session_id)
    OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "Users can register for sessions"
  ON session_participants FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users update own registrations"
  ON session_participants FOR UPDATE
  USING (
    auth.uid()::text = user_id
    OR auth.uid()::text IN (SELECT instructor_id FROM live_sessions WHERE id = session_id)
    OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "Users can cancel own registrations"
  ON session_participants FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS Policies for session_notifications
CREATE POLICY "Users view own notifications"
  ON session_notifications FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR auth.uid()::text IN (SELECT instructor_id FROM live_sessions WHERE id = session_id)
    OR auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "Admins manage notifications"
  ON session_notifications FOR ALL
  USING (auth.uid()::text IN (SELECT id FROM users WHERE role = 'admin'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_live_sessions_updated_at ON live_sessions;
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_participants_updated_at ON session_participants;
CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_notifications_updated_at ON session_notifications;
CREATE TRIGGER update_session_notifications_updated_at
  BEFORE UPDATE ON session_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update session status
CREATE OR REPLACE FUNCTION update_session_status()
RETURNS void AS $$
BEGIN
  -- Mark sessions as completed if ended
  UPDATE live_sessions
  SET status = 'completed',
      ended_at = COALESCE(ended_at, scheduled_end),
      actual_duration_minutes = EXTRACT(EPOCH FROM (COALESCE(ended_at, scheduled_end) - COALESCE(started_at, scheduled_start)))::integer / 60
  WHERE status IN ('scheduled', 'live')
    AND scheduled_end < NOW();
  
  -- Mark sessions as live if started
  UPDATE live_sessions
  SET status = 'live',
      started_at = COALESCE(started_at, NOW())
  WHERE status = 'scheduled'
    AND scheduled_start <= NOW()
    AND scheduled_end > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create automatic reminders when session is created
CREATE OR REPLACE FUNCTION create_session_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- 24-hour reminder
  IF NEW.scheduled_start > NOW() + INTERVAL '24 hours' THEN
    INSERT INTO session_notifications (session_id, notification_type, scheduled_for, title, message)
    VALUES (
      NEW.id,
      'reminder_24h',
      NEW.scheduled_start - INTERVAL '24 hours',
      'Reminder: Session tomorrow',
      'Your session "' || NEW.title || '" starts in 24 hours'
    );
  END IF;
  
  -- 1-hour reminder
  IF NEW.scheduled_start > NOW() + INTERVAL '1 hour' THEN
    INSERT INTO session_notifications (session_id, notification_type, scheduled_for, title, message)
    VALUES (
      NEW.id,
      'reminder_1h',
      NEW.scheduled_start - INTERVAL '1 hour',
      'Reminder: Session starting soon',
      'Your session "' || NEW.title || '" starts in 1 hour'
    );
  END IF;
  
  -- Starting now notification
  INSERT INTO session_notifications (session_id, notification_type, scheduled_for, title, message, notification_data)
  VALUES (
    NEW.id,
    'starting_now',
    NEW.scheduled_start,
    'Session is starting now!',
    'Join "' || NEW.title || '" now',
    jsonb_build_object('join_url', NEW.zoom_join_url)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_session_reminders ON live_sessions;
CREATE TRIGGER trigger_create_session_reminders
  AFTER INSERT ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_session_reminders();

-- Update duration_minutes when scheduled times change
CREATE OR REPLACE FUNCTION update_duration_minutes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.scheduled_end - NEW.scheduled_start))::integer / 60;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_duration ON live_sessions;
CREATE TRIGGER trigger_update_duration
  BEFORE INSERT OR UPDATE OF scheduled_start, scheduled_end ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_duration_minutes();

-- Comments for documentation
COMMENT ON TABLE live_sessions IS 'Zoom-integrated live sessions for CIMA Learn platform';
COMMENT ON TABLE session_participants IS 'Tracks user registrations and attendance for live sessions';
COMMENT ON TABLE session_notifications IS 'Queue for sending session reminders and notifications';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Live Sessions tables created successfully!';
  RAISE NOTICE 'Tables: live_sessions, session_participants, session_notifications';
  RAISE NOTICE 'Ready to use with your Zoom API integration.';
END $$;
