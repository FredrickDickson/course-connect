-- ============================================
-- AI TUTOR DIAGNOSTIC SCRIPT
-- Run this to diagnose AI Tutor issues
-- ============================================

-- 1. Check if tables exist
DO $$
DECLARE
  conv_exists BOOLEAN;
  msg_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== CHECKING DATABASE TABLES ===';
  RAISE NOTICE '';
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_tutor_conversations'
  ) INTO conv_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_tutor_messages'
  ) INTO msg_exists;
  
  IF conv_exists THEN
    RAISE NOTICE '✅ ai_tutor_conversations table EXISTS';
  ELSE
    RAISE NOTICE '❌ ai_tutor_conversations table MISSING - This is the problem!';
    RAISE NOTICE '   → Run CREATE_AI_TUTOR_TABLES.sql to fix';
  END IF;
  
  IF msg_exists THEN
    RAISE NOTICE '✅ ai_tutor_messages table EXISTS';
  ELSE
    RAISE NOTICE '❌ ai_tutor_messages table MISSING - This is the problem!';
    RAISE NOTICE '   → Run CREATE_AI_TUTOR_TABLES.sql to fix';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 2. If tables exist, check their structure
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_tutor_conversations') THEN
    RAISE NOTICE '=== CHECKING ai_tutor_conversations STRUCTURE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Columns:';
  END IF;
END $$;

SELECT 
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_name = 'ai_tutor_conversations'
ORDER BY ordinal_position;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_tutor_messages') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING ai_tutor_messages STRUCTURE ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Columns:';
  END IF;
END $$;

SELECT 
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns
WHERE table_name = 'ai_tutor_messages'
ORDER BY ordinal_position;

-- 3. Check RLS policies
DO $$
DECLARE
  conv_rls BOOLEAN;
  msg_rls BOOLEAN;
  conv_policy_count INTEGER;
  msg_policy_count INTEGER;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_tutor_conversations') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING ROW LEVEL SECURITY ===';
    RAISE NOTICE '';
    
    SELECT relrowsecurity INTO conv_rls
    FROM pg_class
    WHERE relname = 'ai_tutor_conversations';
    
    SELECT relrowsecurity INTO msg_rls
    FROM pg_class
    WHERE relname = 'ai_tutor_messages';
    
    IF conv_rls THEN
      RAISE NOTICE '✅ RLS enabled on ai_tutor_conversations';
    ELSE
      RAISE NOTICE '⚠️  RLS disabled on ai_tutor_conversations';
    END IF;
    
    IF msg_rls THEN
      RAISE NOTICE '✅ RLS enabled on ai_tutor_messages';
    ELSE
      RAISE NOTICE '⚠️  RLS disabled on ai_tutor_messages';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Policies:';
  END IF;
END $$;

SELECT 
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('ai_tutor_conversations', 'ai_tutor_messages')
ORDER BY tablename, policyname;

-- 4. Check indexes
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_tutor_conversations') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING INDEXES ===';
    RAISE NOTICE '';
  END IF;
END $$;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('ai_tutor_conversations', 'ai_tutor_messages')
ORDER BY tablename, indexname;

-- 5. Check data (if tables exist)
DO $$
DECLARE
  conv_count INTEGER := 0;
  msg_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_tutor_conversations') THEN
    RAISE NOTICE '';
    RAISE NOTICE '=== CHECKING DATA ===';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO conv_count FROM ai_tutor_conversations;
    SELECT COUNT(*) INTO msg_count FROM ai_tutor_messages;
    
    RAISE NOTICE 'Conversations: %', conv_count;
    RAISE NOTICE 'Messages: %', msg_count;
    
    IF conv_count = 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '💡 No conversations yet - try using the AI Tutor!';
    END IF;
  END IF;
END $$;

-- 6. Summary and recommendations
DO $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DIAGNOSIS SUMMARY ===';
  RAISE NOTICE '';
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name IN ('ai_tutor_conversations', 'ai_tutor_messages')
    AND table_schema = 'public'
  ) INTO tables_exist;
  
  IF NOT tables_exist THEN
    RAISE NOTICE '❌ PROBLEM FOUND: AI Tutor tables do not exist';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 SOLUTION:';
    RAISE NOTICE '   1. Open CREATE_AI_TUTOR_TABLES.sql';
    RAISE NOTICE '   2. Copy the entire SQL script';
    RAISE NOTICE '   3. Run it in this SQL Editor';
    RAISE NOTICE '   4. Test the AI Tutor again';
    RAISE NOTICE '';
    RAISE NOTICE '📖 Full guide: See FIX_AI_TUTOR_ERROR.md';
  ELSE
    RAISE NOTICE '✅ Tables exist - checking other potential issues...';
    RAISE NOTICE '';
    RAISE NOTICE 'If AI Tutor still fails, check:';
    RAISE NOTICE '   1. Is DEEPSEEK_API_KEY set in .env?';
    RAISE NOTICE '   2. Is the API key valid? Test at https://platform.deepseek.com';
    RAISE NOTICE '   3. Check browser console (F12) for frontend errors';
    RAISE NOTICE '   4. Check server logs for backend errors';
    RAISE NOTICE '   5. Are you logged in to CIMA Learn?';
  END IF;
END $$;
