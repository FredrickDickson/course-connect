-- Add forum-attachments storage bucket for community forum image uploads

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('forum-attachments', 'forum-attachments', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']);

-- Storage policies for forum-attachments
-- Anyone can view attachments (public bucket)
CREATE POLICY "forum_attachments_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'forum-attachments');

-- Authenticated users can upload attachments
CREATE POLICY "forum_attachments_user_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'forum-attachments' AND auth.uid() IS NOT NULL);

-- Users can only delete their own attachments (filename starts with their user id)
CREATE POLICY "forum_attachments_user_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'forum-attachments' AND 
  auth.uid()::text = split_part(name, '-', 1)
);
