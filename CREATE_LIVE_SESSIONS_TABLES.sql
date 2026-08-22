-- ============================================================================
-- LIVE SESSIONS FEATURE - Database Schema
-- ============================================================================
-- Create tables for managing Zoom-integrated live sessions on CIMA Learn

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
  duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60) STORED,
  timezone TEXT DEFAULT 'UTC',
  
  -- Zoom integration
  zoom_meeting_id TEXT UNIQUE,
  zoom_meeting_password TEXT,
  zoom_join_url TEXT,
  zoom_start_url TEXT, -- For host to start meeting
  zoom_registration_url TEXT, -- Optional registration
  
  -- Access control
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- Optional: Link to specific course
  is_public BOOLEAN DEFAULT false, -- Public webinars vs enrolled students only
  max_participants INTEGER, -- Optional capacity limit
  
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
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Validation constraints
  CONSTRAINT valid_schedule CHECK (scheduled_end > scheduled_start),
  CONSTRAINT valid_duration CHECK (duration_minutes <= 240) -- Max 4 hours per session
);

-- Session participants/registrations
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
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
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for broadcast notifications
  
  notification_type TEXT CHECK (notification_type IN ('scheduled', 'reminder_24h', 'reminder_1h', 'starting_now', 'cancelled', 'recording_available')) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  
  -- Notification content
  title TEXT,
  message TEXT,
  notification_data JSONB, -- Additional data (join link, etc.)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- RLS Policies for live_sessions

-- Public read for public sessions OR enrolled students OR instructors/admins
CREATE POLICY "Anyone can view public sessions"
  ON live_sessions FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = instructor_id
    OR auth.uid() IN (SELECT user_id FROM users WHERE role IN ('admin'))
    OR (course_id IS NOT NULL AND auth.uid() IN (SELECT user_id FROM enrollments WHERE course_id = live_sessions.course_id AND status = 'ACTIVE'))
  );

-- Instructors and admins can create sessions
CREATE POLICY "Instructors and admins can create sessions"
  ON live_sessions FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM users WHERE role IN ('instructor', 'admin'))
  );

-- Instructors can update their own sessions, admins can update all
CREATE POLICY "Instructors can update own sessions, admins all"
  ON live_sessions FOR UPDATE
  USING (
    auth.uid() = instructor_id
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- Instructors can delete their own sessions, admins can delete all
CREATE POLICY "Instructors can delete own sessions, admins all"
  ON live_sessions FOR DELETE
  USING (
    auth.uid() = instructor_id
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- RLS Policies for session_participants

-- Users can view their own registrations, instructors can view all for their sessions
CREATE POLICY "Users view own registrations, instructors view session registrations"
  ON session_participants FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT instructor_id FROM live_sessions WHERE id = session_id)
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- Authenticated users can register themselves
CREATE POLICY "Users can register for sessions"
  ON session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own registrations (cancel), instructors can mark attendance
CREATE POLICY "Users update own registrations"
  ON session_participants FOR UPDATE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT instructor_id FROM live_sessions WHERE id = session_id)
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- Users can delete their own registrations
CREATE POLICY "Users can cancel own registrations"
  ON session_participants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for session_notifications

-- Users can view their own notifications
CREATE POLICY "Users view own notifications"
  ON session_notifications FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT instructor_id FROM live_sessions WHERE id = session_id)
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

-- System/admins can manage notifications
CREATE POLICY "Admins manage notifications"
  ON session_notifications FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_participants_updated_at
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
      actual_duration_minutes = EXTRACT(EPOCH FROM (COALESCE(ended_at, scheduled_end) - COALESCE(started_at, scheduled_start))) / 60
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

CREATE TRIGGER trigger_create_session_reminders
  AFTER INSERT ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_session_reminders();

-- Comments for documentation
COMMENT ON TABLE live_sessions IS 'Zoom-integrated live sessions for CIMA Learn platform';
COMMENT ON TABLE session_participants IS 'Tracks user registrations and attendance for live sessions';
COMMENT ON TABLE session_notifications IS 'Queue for sending session reminders and notifications';

-- Grant permissions (adjust as needed for your setup)
GRANT ALL ON live_sessions TO authenticated;
GRANT ALL ON session_participants TO authenticated;
GRANT ALL ON session_notifications TO authenticated;
