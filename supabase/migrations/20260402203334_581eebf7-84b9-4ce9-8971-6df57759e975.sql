
-- Allow authenticated users to upload videos
CREATE POLICY "authenticated_users_upload_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-videos');

-- Allow authenticated users to read videos
CREATE POLICY "authenticated_users_read_videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'course-videos');

-- Allow authenticated users to update their videos
CREATE POLICY "authenticated_users_update_videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'course-videos');

-- Allow authenticated users to delete their videos
CREATE POLICY "authenticated_users_delete_videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'course-videos');
