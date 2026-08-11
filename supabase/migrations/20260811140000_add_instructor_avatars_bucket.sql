-- Add instructor-avatars storage bucket for instructor profile photos
-- (referenced by client/src/pages/create-course.tsx via ImageUploader bucket="instructor-avatars",
-- but was never created -- uploads fell back to client-side createBucket(), which storage RLS rejects)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('instructor-avatars', 'instructor-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "instructor_avatars_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'instructor-avatars');

CREATE POLICY "instructor_avatars_instructor_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'instructor-avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = (auth.uid())::text
      AND u.role IN ('instructor','admin')
  )
);

CREATE POLICY "instructor_avatars_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'instructor-avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
