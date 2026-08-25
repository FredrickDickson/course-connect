-- Lightweight, per-assignment groups (not persistent course-wide teams). No cap on
-- the number of groups or members per group -- a course could have 50 students in
-- 4 groups or 500 in 40; nothing here enforces a size.

CREATE TABLE public.assignment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.assignment_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_at timestamp DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_assignment_groups_assignment_id ON public.assignment_groups(assignment_id);
CREATE INDEX idx_assignment_group_members_group_id ON public.assignment_group_members(group_id);
CREATE INDEX idx_assignment_group_members_user_id ON public.assignment_group_members(user_id);

-- assignment_id on assignment_group_members is denormalized (needed for the
-- UNIQUE (assignment_id, user_id) constraint, since Postgres unique constraints
-- can't reach through a FK to a parent's parent). Guard it against drifting from
-- the group's real assignment_id.
CREATE OR REPLACE FUNCTION public.check_group_member_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assignment_id <> (SELECT assignment_id FROM public.assignment_groups WHERE id = NEW.group_id) THEN
    RAISE EXCEPTION 'group_id does not belong to assignment_id' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_group_member_assignment
  BEFORE INSERT OR UPDATE ON public.assignment_group_members
  FOR EACH ROW EXECUTE FUNCTION public.check_group_member_assignment();

ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_group_members ENABLE ROW LEVEL SECURITY;

-- Groups: any member of the group can see it (so they know their team name);
-- instructor/admin (via assignment_course_id, works regardless of anchor) sees
-- and manages all groups for their assignment.
CREATE POLICY "assignment_groups_member_select" ON public.assignment_groups FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id = assignment_groups.id AND gm.user_id = auth.uid()::text
  )
  OR public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
);
CREATE POLICY "assignment_groups_instructor_manage" ON public.assignment_groups FOR ALL TO authenticated USING (
  public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
) WITH CHECK (
  public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
);

-- Members: any member of the SAME group can see the roster (so they know their
-- teammates); instructor/admin sees and manages all.
CREATE POLICY "assignment_group_members_select" ON public.assignment_group_members FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM assignment_group_members gm2
    WHERE gm2.group_id = assignment_group_members.group_id AND gm2.user_id = auth.uid()::text
  )
  OR public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
);
CREATE POLICY "assignment_group_members_instructor_manage" ON public.assignment_group_members FOR ALL TO authenticated USING (
  public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
) WITH CHECK (
  public.user_owns_course(public.assignment_course_id(assignment_id), auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_group_members TO authenticated;
