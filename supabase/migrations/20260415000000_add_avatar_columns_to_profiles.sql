-- Add avatar_url and avatar_updated_at columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user avatar image stored in Supabase storage';
COMMENT ON COLUMN public.profiles.avatar_updated_at IS 'Timestamp when the avatar was last updated';

-- Add UPDATE policy for user-avatars storage bucket to support upsert operations
CREATE POLICY IF NOT EXISTS "user_avatars_user_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
