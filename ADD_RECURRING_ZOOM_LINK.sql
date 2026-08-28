-- Allow every occurrence in a recurring series to reference one Zoom meeting.
-- Run this once in the Supabase SQL Editor before creating recurring sessions.

ALTER TABLE public.live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_zoom_meeting_id_key;