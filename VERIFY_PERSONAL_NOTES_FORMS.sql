-- ============================================
-- VERIFY: Personal Notes Forms Setup
-- Check if everything is working correctly
-- ============================================

-- 1. Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_notes_forms') THEN
    RAISE NOTICE '✅ Table "personal_notes_forms" exists';
  ELSE
    RAISE NOTICE '❌ Table "personal_notes_forms" NOT FOUND';
  END IF;
END $$;

-- 2. Check if storage bucket exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'personal-notes-forms') 
    THEN '✅ Storage bucket "personal-notes-forms" exists'
    ELSE '❌ Storage bucket "personal-notes-forms" NOT FOUND'
  END AS bucket_status;

-- 3. Count total forms
SELECT 
  COUNT(*) as total_forms,
  '📊 Total forms in database' as description
FROM personal_notes_forms;

-- 4. Check RLS policies
SELECT 
  COUNT(*) as policy_count,
  '🔒 RLS policies configured' as description
FROM pg_policies 
WHERE tablename = 'personal_notes_forms';

-- 5. Show recent submissions
SELECT 
  full_name,
  gender,
  age,
  town_city || ', ' || region as location,
  nok_telephone as emergency_phone,
  blood_group,
  TO_CHAR(submitted_at, 'YYYY-MM-DD HH24:MI') as submitted
FROM personal_notes_forms
ORDER BY submitted_at DESC
LIMIT 10;

-- 6. Statistics by gender
SELECT 
  gender,
  COUNT(*) as count,
  ROUND(AVG(age), 1) as avg_age
FROM personal_notes_forms
GROUP BY gender;

-- 7. Statistics by region
SELECT 
  region,
  COUNT(*) as count
FROM personal_notes_forms
GROUP BY region
ORDER BY count DESC;

-- 8. Forms with health conditions
SELECT 
  full_name,
  blood_group,
  ARRAY_LENGTH(medical_conditions, 1) as condition_count,
  medical_conditions
FROM personal_notes_forms
WHERE medical_conditions IS NOT NULL 
  AND ARRAY_LENGTH(medical_conditions, 1) > 0
ORDER BY condition_count DESC;

-- Final summary
DO $$
DECLARE
  total_count INTEGER;
  reviewed_count INTEGER;
  pending_count INTEGER;
  male_count INTEGER;
  female_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM personal_notes_forms;
  SELECT COUNT(*) INTO reviewed_count FROM personal_notes_forms WHERE reviewed_at IS NOT NULL;
  SELECT COUNT(*) INTO pending_count FROM personal_notes_forms WHERE reviewed_at IS NULL;
  SELECT COUNT(*) INTO male_count FROM personal_notes_forms WHERE gender = 'male';
  SELECT COUNT(*) INTO female_count FROM personal_notes_forms WHERE gender = 'female';
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 PERSONAL NOTES FORMS - SYSTEM STATUS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 FORM STATISTICS:';
  RAISE NOTICE '   Total Forms: %', total_count;
  RAISE NOTICE '   Reviewed: %', reviewed_count;
  RAISE NOTICE '   Pending Review: %', pending_count;
  RAISE NOTICE '';
  RAISE NOTICE '👥 DEMOGRAPHICS:';
  RAISE NOTICE '   Male: %', male_count;
  RAISE NOTICE '   Female: %', female_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ SYSTEM STATUS: Operational';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  
  IF total_count = 0 THEN
    RAISE NOTICE '⚠️  No forms yet. Run TEST_SUBMIT_MULTIPLE_FORMS.sql to add test data';
  ELSE
    RAISE NOTICE '🎯 Ready to use! Check Admin Dashboard → Personal Notes tab';
  END IF;
  
  RAISE NOTICE '';
END $$;
