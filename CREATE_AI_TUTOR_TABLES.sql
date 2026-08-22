-- ============================================
-- CIMA AI TUTOR - DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Create AI conversations table
CREATE TABLE IF NOT EXISTS ai_tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI messages table
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_tutor_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  lesson_context JSONB,  -- Stores lesson content snapshot for context
  tokens_used INTEGER,
  model VARCHAR(50),  -- Store which AI model was used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_tutor_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_lesson ON ai_tutor_conversations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_course ON ai_tutor_conversations(course_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON ai_tutor_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_tutor_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_tutor_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own conversations" ON ai_tutor_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON ai_tutor_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON ai_tutor_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON ai_tutor_conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON ai_tutor_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON ai_tutor_messages;
DROP POLICY IF EXISTS "Admins can view all conversations" ON ai_tutor_conversations;
DROP POLICY IF EXISTS "Admins can view all messages" ON ai_tutor_messages;

-- RLS Policies for ai_tutor_conversations
CREATE POLICY "Users can view own conversations"
  ON ai_tutor_conversations 
  FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own conversations"
  ON ai_tutor_conversations 
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_tutor_conversations 
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own conversations"
  ON ai_tutor_conversations 
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS Policies for ai_tutor_messages
CREATE POLICY "Users can view own messages"
  ON ai_tutor_messages 
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_tutor_conversations WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON ai_tutor_messages 
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_tutor_conversations WHERE user_id = auth.uid()::text
    )
  );

-- Admin policies (if is_admin function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    -- Allow admins to view all conversations
    EXECUTE 'CREATE POLICY "Admins can view all conversations"
      ON ai_tutor_conversations 
      FOR SELECT
      USING (public.is_admin(auth.uid()::text))';
    
    -- Allow admins to view all messages
    EXECUTE 'CREATE POLICY "Admins can view all messages"
      ON ai_tutor_messages 
      FOR SELECT
      USING (public.is_admin(auth.uid()::text))';
  END IF;
END $$;

-- Create trigger to update last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_tutor_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_conversation_on_message ON ai_tutor_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON ai_tutor_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('ai_tutor_conversations', 'ai_tutor_messages')
AND table_schema = 'public';

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('ai_tutor_conversations', 'ai_tutor_messages')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ AI Tutor tables created successfully!';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '✅ Row Level Security enabled';
  RAISE NOTICE '✅ Policies configured';
  RAISE NOTICE '✅ Triggers set up';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now use the AI Tutor feature in CIMA Learn!';
END $$;
