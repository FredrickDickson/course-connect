-- ============================================
-- Debug why admin can't see forms on production
-- Run this in PRODUCTION Supabase SQL Editor
-- ============================================

-- Step 1: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'personal_notes_forms';

-- Step 2: Check all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'personal_notes_forms'
ORDER BY cmd;

-- Step 3: Check your user's role
SELECT 
  id,
  email,
  role,
  first_name,
  last_name
FROM users
WHERE role = 'admin'
LIMIT 5;

-- Step 4: Test if admin can SELECT (simulate what API does)
-- Replace 'YOUR_ADMIN_USER_ID' with your actual admin user ID
-- Example: SELECT * FROM personal_notes_forms WHERE EXISTS (SELECT 1 FROM users WHERE id = 'your-id' AND role = 'admin');

-- Step 5: Check if forms exist
SELECT 
  id,
  full_name,
  submitted_at,
  reviewed_at
FROM personal_notes_forms
ORDER BY submitted_at DESC
LIMIT 5;

-- Step 6: Verify users table has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('id', 'role')
ORDER BY ordinal_position;
