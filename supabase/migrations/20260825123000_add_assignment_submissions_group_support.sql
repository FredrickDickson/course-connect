-- Adds group-submission support to assignment_submissions and fixes a pre-existing
-- gap in the assignment-submissions storage bucket: it has an owner-only INSERT/
-- UPDATE/DELETE policy set but NO SELECT policy at all today, so even the existing
-- individual-submission download flow (assignment-submit-dialog.tsx's
-- createSignedUrl) has nothing granting read access. This migration adds SELECT
-- for owner/group-member/instructor, alongside the new group-write policies.
--
-- Path convention (unchanged for individual, extended for group), confirmed from
-- the only caller of this bucket (client/src/components/learn/assignment-submit-dialog.tsx):
--   individual: {userId}/{assignmentId}/{randomUUID}-{filename}
--   group:      {groupId}/{assignmentId}/{randomUUID}-{filename}
-- i.e. folder segment 2 is always the assignment id, which is what the new
-- instructor-read policy relies on to resolve ownership via assignment_course_id().

ALTER TABLE public.assignment_submissions
  ADD COLUMN group_id uuid REFERENCES public.assignment_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_assignment_submissions_group_id ON public.assignment_submissions(group_id) WHERE group_id IS NOT NULL;

-- Only one submission row per group (group_id is entirely new, so no pre-existing
-- data can violate this). Individual-mode (assignment_id, user_id) is left without
-- a DB-level uniqueness constraint, matching today's behavior -- the submit dialog
-- already upserts by checking for an existing row first, and retrofitting a unique
-- index onto years of existing submission rows risks failing against duplicates we
-- can't inspect from here.
CREATE UNIQUE INDEX assignment_submissions_group_unique
  ON public.assignment_submissions(assignment_id, group_id) WHERE group_id IS NOT NULL;

-- Any member of the group can read/write the shared submission row; existing
-- policies (assignment_submissions_view_own / _instructors_view / _users_create /
-- _instructors_update, all from the base migration) are untouched and continue to
-- gate the group_id IS NULL (individual) rows exactly as before.
CREATE POLICY "assignment_submissions_group_member_rw" ON public.assignment_submissions FOR ALL TO authenticated USING (
  group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id = assignment_submissions.group_id AND gm.user_id = auth.uid()::text
  )
) WITH CHECK (
  group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id = assignment_submissions.group_id AND gm.user_id = auth.uid()::text
  )
);

-- Storage: SELECT (owner, group member, or the assignment's instructor/admin)
CREATE POLICY "assignment_submissions_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'assignment-submissions'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM assignment_group_members gm
      WHERE gm.group_id::text = (storage.foldername(name))[1] AND gm.user_id = auth.uid()::text
    )
    OR public.user_owns_course(
      public.assignment_course_id(((storage.foldername(name))[2])::uuid),
      auth.uid()
    )
  )
);

-- Storage: INSERT/UPDATE/DELETE for group uploads, mirroring the existing
-- owner-only policies (assignment_submissions_user_write/_update/_delete)
CREATE POLICY "assignment_submissions_group_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1] AND gm.user_id = auth.uid()::text
  )
);
CREATE POLICY "assignment_submissions_group_update" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1] AND gm.user_id = auth.uid()::text
  )
);
CREATE POLICY "assignment_submissions_group_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM assignment_group_members gm
    WHERE gm.group_id::text = (storage.foldername(name))[1] AND gm.user_id = auth.uid()::text
  )
);

-- The bucket's allowed_mime_types was limited to PDF/legacy-.doc/plain-text, which
-- is too narrow for real document submissions (e.g. Mock Arbitration briefs are
-- realistically .docx/.pptx, and photographed evidence as images). Widen it.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png'
]
WHERE id = 'assignment-submissions';
