-- Instructor/admin-scheduled Zoom meeting per group (not student self-serve).
-- Deliberately a separate table from live_sessions rather than overloading it --
-- group meetings don't need live_sessions' public/registration/capacity semantics,
-- they're a private meeting for one group + its instructor. Reuses the existing
-- ZoomService (server/services/zoom.ts) exactly as server/routes/live-sessions.ts
-- does today; this migration only adds the storage table + RLS.

CREATE TABLE public.assignment_group_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
  instructor_id varchar REFERENCES public.users(id) ON DELETE SET NULL,
  zoom_meeting_id text UNIQUE,
  zoom_join_url text,
  zoom_start_url text,
  scheduled_start timestamp NOT NULL,
  scheduled_end timestamp NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamp DEFAULT now(),
  CONSTRAINT assignment_group_meetings_valid_schedule CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX idx_assignment_group_meetings_group_id ON public.assignment_group_meetings(group_id);
CREATE INDEX idx_assignment_group_meetings_assignment_id ON public.assignment_group_meetings(assignment_id);

ALTER TABLE public.assignment_group_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_group_meetings_member_select" ON public.assignment_group_meetings FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id = assignment_group_meetings.group_id AND gm.user_id = auth.uid()::text
  )
  OR public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
);

CREATE POLICY "assignment_group_meetings_instructor_manage" ON public.assignment_group_meetings FOR ALL TO authenticated USING (
  public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
) WITH CHECK (
  public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_group_meetings TO authenticated;
