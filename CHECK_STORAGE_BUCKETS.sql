-- Check if storage buckets exist and are configured correctly
-- Run this in your Supabase SQL Editor

-- Check existing buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('course-thumbnails', 'instructor-avatars');

-- If buckets don't exist, create them:
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('course-thumbnails', 'course-thumbnails', true, 5242880),
  ('instructor-avatars', 'instructor-avatars', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Check storage policies for course-thumbnails bucket
SELECT * FROM storage.policies 
WHERE bucket_id = 'course-thumbnails';

-- Check storage policies for instructor-avatars bucket  
SELECT * FROM storage.policies
WHERE bucket_id = 'instructor-avatars';

-- If no policies exist, you need to add them.
-- For public upload and read access:

-- Allow public read access for course-thumbnails
CREATE POLICY IF NOT EXISTS "Public read access for course thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Allow authenticated users to upload course thumbnails
CREATE POLICY IF NOT EXISTS "Authenticated users can upload course thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-thumbnails' AND auth.role() = 'authenticated');

-- Allow users to update their own uploads
CREATE POLICY IF NOT EXISTS "Users can update their own course thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'course-thumbnails');

-- Allow users to delete their own uploads
CREATE POLICY IF NOT EXISTS "Users can delete their own course thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Repeat for instructor-avatars bucket
CREATE POLICY IF NOT EXISTS "Public read access for instructor avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'instructor-avatars');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload instructor avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'instructor-avatars' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Users can update their own instructor avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'instructor-avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'instructor-avatars');

CREATE POLICY IF NOT EXISTS "Users can delete their own instructor avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'instructor-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
