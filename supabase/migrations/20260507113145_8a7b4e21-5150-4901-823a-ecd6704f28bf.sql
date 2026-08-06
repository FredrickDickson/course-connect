
DROP POLICY IF EXISTS "forum_attachments_public_read" ON storage.objects;
CREATE POLICY "forum_attachments_authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'forum-attachments');
