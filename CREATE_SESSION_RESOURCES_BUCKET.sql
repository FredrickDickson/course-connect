-- Create storage bucket for session resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-resources', 'session-resources', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for session-resources bucket
DROP POLICY IF EXISTS "session_resources_read" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_upload" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_update" ON storage.objects;
DROP POLICY IF EXISTS "session_resources_delete" ON storage.objects;

-- Allow authenticated users to read session resources
CREATE POLICY "session_resources_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'session-resources');

-- Allow instructors/admins to upload session resources
CREATE POLICY "session_resources_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'session-resources'
    AND auth.uid() IS NOT NULL
  );

-- Allow instructors/admins to update their session resources
CREATE POLICY "session_resources_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'session-resources'
    AND auth.uid() IS NOT NULL
  );

-- Allow instructors/admins to delete their session resources
CREATE POLICY "session_resources_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'session-resources'
    AND auth.uid() IS NOT NULL
  );
