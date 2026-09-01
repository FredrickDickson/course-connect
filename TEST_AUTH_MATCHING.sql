-- ============================================
-- Test if auth.uid() matches users.id
-- This checks if the RLS policy condition will work
-- Run this in PRODUCTION Supabase SQL Editor while logged in as admin
-- ============================================

-- Step 1: Check what auth.uid() returns
SELECT 
  auth.uid() as auth_user_id,
  auth.uid()::text as auth_user_id_as_text,
  pg_typeof(auth.uid()) as auth_uid_type;

-- Step 2: Check your user record in users table
SELECT 
  id as user_table_id,
  email,
  role,
  pg_typeof(id) as id_type
FROM users
WHERE email = 'YOUR_ADMIN_EMAIL_HERE'  -- Replace with your actual admin email
LIMIT 1;

-- Step 3: Test if they match
SELECT 
  auth.uid()::text as auth_id,
  u.id as user_id,
  u.email,
  u.role,
  CASE 
    WHEN u.id = auth.uid()::text THEN '✅ MATCH - Policy will work'
    ELSE '❌ NO MATCH - Policy will fail'
  END as match_status
FROM users u
WHERE u.id = auth.uid()::text;

-- Step 4: Test the actual policy condition
SELECT 
  COUNT(*) as forms_visible_to_you,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ You can see forms'
    ELSE '❌ You cannot see forms - policy is blocking'
  END as access_status
FROM personal_notes_forms
WHERE EXISTS (
  SELECT 1 FROM public.users
  WHERE public.users.id = auth.uid()::text
  AND public.users.role = 'admin'
);

-- Step 5: Bypass RLS to see if forms exist at all
SELECT 
  COUNT(*) as total_forms_in_table
FROM personal_notes_forms;

-- Step 6: Check if RLS is the problem
SELECT 
  'If total_forms_in_table > 0 but forms_visible_to_you = 0, then RLS is blocking access' as diagnosis;
