-- Fix lesson-resources bucket configuration
-- Add file size limit and allowed MIME types to prevent 400 errors

UPDATE storage.buckets
SET 
  file_size_limit = 52428800, -- 50MB (matches MAX_MB in instructor-resource-upload.tsx)
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'text/plain'
  ]
WHERE id = 'lesson-resources';
