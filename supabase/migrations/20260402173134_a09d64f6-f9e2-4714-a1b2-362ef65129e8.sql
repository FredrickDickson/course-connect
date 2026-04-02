-- RLS policies for instructor-cv bucket
CREATE POLICY "Authenticated users can upload CV"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'instructor-cv');

CREATE POLICY "Users can view their own CV"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'instructor-cv' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read access for instructor CVs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'instructor-cv');

-- RLS policies for instructor-videos bucket
CREATE POLICY "Authenticated users can upload intro video"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'instructor-videos');

CREATE POLICY "Users can view their own intro video"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'instructor-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read access for instructor videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'instructor-videos');