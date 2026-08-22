-- Check if AI Tutor tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ai_tutor_conversations', 'ai_tutor_messages')
AND table_schema = 'public';

-- If tables exist, check their structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'ai_tutor_conversations'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'ai_tutor_messages'
ORDER BY ordinal_position;
