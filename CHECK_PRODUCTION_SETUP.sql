-- ============================================
-- Check if Personal Notes Forms table exists in PRODUCTION
-- Run this in your PRODUCTION Supabase SQL Editor
-- ============================================

-- Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'personal_notes_forms';

-- Check if storage bucket exists
SELECT 
  id,
  name,
  public
FROM storage.buckets
WHERE name = 'personal-notes-forms';

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive
FROM pg_policies 
WHERE tablename = 'personal_notes_forms'
ORDER BY cmd;

-- Check if there's any data
SELECT 
  COUNT(*) as total_forms,
  COUNT(CASE WHEN reviewed_at IS NOT NULL THEN 1 END) as reviewed_count,
  COUNT(CASE WHEN reviewed_at IS NULL THEN 1 END) as pending_count
FROM personal_notes_forms;
