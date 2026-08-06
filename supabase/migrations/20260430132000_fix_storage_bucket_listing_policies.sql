-- Fix public storage bucket listing policies
-- This prevents clients from listing all files in public buckets
-- Fixes "Public Bucket Allows Listing" warnings from Supabase advisors

-- Drop existing broad SELECT policies on storage.objects for each bucket
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "certificates_public_read" ON storage.objects;
DROP POLICY IF EXISTS "course_thumbnails_public_read" ON storage.objects;
DROP POLICY IF EXISTS "forum_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_public_read" ON storage.objects;

-- Create more restrictive policies that allow reading specific files without listing

-- Avatars bucket - allow public read of specific avatar files
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Certificates bucket - allow public read of specific certificate files
CREATE POLICY "certificates_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Course thumbnails - allow public read for all (images need to be publicly accessible)
CREATE POLICY "course_thumbnails_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'course-thumbnails'
  );

-- Forum attachments - allow read for authenticated users
CREATE POLICY "forum_attachments_public_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'forum-attachments'
  );

-- User avatars - allow public read of specific user avatar files
CREATE POLICY "user_avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add INSERT policies for authenticated users to upload to their own folders
CREATE POLICY "Authenticated can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated can upload to user-avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated can upload forum attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add UPDATE and DELETE policies for users to manage their own files
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own user-avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own user-avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own forum attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own forum attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
