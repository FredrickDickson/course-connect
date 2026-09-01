-- Check the actual structure of personal_notes_forms table
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'personal_notes_forms'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'personal_notes_forms'
) as table_exists;

-- Check storage bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'personal-notes-forms';

-- Check storage policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%personal_notes_forms%';
