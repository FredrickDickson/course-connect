-- ============================================
-- DEBUG: Check Personal Notes Forms Access
-- ============================================

-- 1. Check if forms exist in database
SELECT 
  COUNT(*) as total_forms,
  '📊 Total forms in database' as description
FROM personal_notes_forms;

-- 2. Show all forms (bypass RLS for testing)
SELECT 
  id,
  full_name,
  gender,
  age,
  town_city,
  submitted_at
FROM personal_notes_forms
ORDER BY submitted_at DESC;

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'personal_notes_forms';

-- 4. Check if your user is admin
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT 
  id,
  email,
  role,
  first_name,
  last_name
FROM users
WHERE role = 'admin'
LIMIT 5;

-- 5. Test the RLS policy manually
-- This simulates what happens when admin tries to view
DO $$
DECLARE
  admin_count INTEGER;
  form_count INTEGER;
BEGIN
  -- Check how many admins exist
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  
  -- Check how many forms exist
  SELECT COUNT(*) INTO form_count FROM personal_notes_forms;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 DEBUG INFORMATION';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Total forms in database: %', form_count;
  RAISE NOTICE 'Total admin users: %', admin_count;
  RAISE NOTICE '';
  
  IF form_count = 0 THEN
    RAISE NOTICE '❌ No forms found. Run TEST_SUBMIT_MULTIPLE_FORMS.sql';
  ELSE
    RAISE NOTICE '✅ Forms exist in database';
  END IF;
  
  IF admin_count = 0 THEN
    RAISE NOTICE '❌ No admin users found. Check users table';
  ELSE
    RAISE NOTICE '✅ Admin users exist';
  END IF;
  
  RAISE NOTICE '';
END $$;
