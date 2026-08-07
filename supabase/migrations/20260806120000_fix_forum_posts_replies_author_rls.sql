-- forum_posts.author_id and forum_replies.author_id reference profiles.id
-- (a separate generated PK), not the auth user id. Every write-side RLS
-- policy on these two tables was comparing author_id directly against
-- auth.uid() (the auth user id) instead of resolving it through
-- profiles.user_id, which is always false for a real author_id value.
-- Net effect: no real user has ever been able to INSERT/UPDATE/DELETE a
-- forum post or reply as themselves - every write silently 42501'd.
-- Discovered via the E2E "create a topic" test hitting
-- "new row violates row-level security policy for table forum_posts".
--
-- The SELECT policies' moderator/instructor/admin override branch had the
-- same profiles.id-vs-auth.uid() mixup (profiles.id = auth.uid() is never
-- true), so that override branch was silently dead too - fixed alongside
-- the write policies for consistency, though the primary (is_course_board
-- = false) branch already covers the common case.

-- forum_posts

ALTER POLICY "Authenticated create posts" ON forum_posts
  WITH CHECK (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

ALTER POLICY "forum_posts_user_create" ON forum_posts
  WITH CHECK (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

ALTER POLICY "Users update own posts" ON forum_posts
  USING (
    (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text))
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()::text AND profiles.community_role = ANY (ARRAY['moderator'::text, 'admin'::text])))
    OR (EXISTS (SELECT 1 FROM instructor_assignments WHERE instructor_assignments.user_id::text = auth.uid()::text AND instructor_assignments.board_id = forum_posts.board_id))
  );

ALTER POLICY "forum_posts_user_update_own" ON forum_posts
  USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

ALTER POLICY "Users delete own posts" ON forum_posts
  USING (
    ((author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text)) AND reply_count = 0)
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()::text AND profiles.community_role = ANY (ARRAY['moderator'::text, 'admin'::text])))
  );

ALTER POLICY "forum_posts_user_delete_own" ON forum_posts
  USING (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

ALTER POLICY "Authenticated read for forum_posts" ON forum_posts
  USING (
    EXISTS (
      SELECT 1 FROM forum_boards
      WHERE forum_boards.id = forum_posts.board_id
        AND (
          forum_boards.is_course_board = false
          OR EXISTS (SELECT 1 FROM enrollments WHERE enrollments.user_id::text = auth.uid()::text AND enrollments.course_id = forum_boards.course_edition_id)
          OR EXISTS (SELECT 1 FROM instructor_assignments WHERE instructor_assignments.user_id::text = auth.uid()::text AND instructor_assignments.board_id = forum_boards.id)
          OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()::text AND profiles.community_role = ANY (ARRAY['instructor'::text, 'moderator'::text, 'admin'::text]))
        )
    )
  );

-- forum_replies

ALTER POLICY "Authenticated create replies" ON forum_replies
  WITH CHECK (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

ALTER POLICY "Users update own replies" ON forum_replies
  USING (
    (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text))
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()::text AND profiles.community_role = ANY (ARRAY['moderator'::text, 'admin'::text])))
  );

ALTER POLICY "Users delete own replies" ON forum_replies
  USING (
    (author_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()::text))
    OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()::text AND profiles.community_role = ANY (ARRAY['moderator'::text, 'admin'::text])))
  );

ALTER POLICY "Authenticated read for forum_replies" ON forum_replies
  USING (
    EXISTS (
      SELECT 1 FROM forum_posts
      WHERE forum_posts.id = forum_replies.post_id
        AND EXISTS (
          SELECT 1 FROM forum_boards
          WHERE forum_boards.id = forum_posts.board_id
            AND (
              forum_boards.is_course_board = false
              OR EXISTS (SELECT 1 FROM enrollments WHERE enrollments.user_id::text = auth.uid()::text AND enrollments.course_id = forum_boards.course_edition_id)
              OR EXISTS (SELECT 1 FROM instructor_assignments WHERE instructor_assignments.user_id::text = auth.uid()::text AND instructor_assignments.board_id = forum_boards.id)
              OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid()::text AND profiles.community_role = ANY (ARRAY['instructor'::text, 'moderator'::text, 'admin'::text]))
            )
        )
    )
  );
