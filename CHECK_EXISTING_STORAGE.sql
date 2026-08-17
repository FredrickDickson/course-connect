-- Just CHECK what storage buckets and policies already exist
-- Run this to see your current setup

-- Check if buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('course-thumbnails', 'instructor-avatars');

-- Check policies for course-thumbnails
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%course%thumbnail%';

-- Check policies for instructor-avatars
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%instructor%avatar%';

-- Count objects in each bucket
SELECT 
  bucket_id,
  COUNT(*) as file_count
FROM storage.objects
WHERE bucket_id IN ('course-thumbnails', 'instructor-avatars')
GROUP BY bucket_id;
