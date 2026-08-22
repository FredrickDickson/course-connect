# 🔧 Fix AI Tutor "Failed to send message" Error

## 📋 Problem Summary

The AI Tutor is showing "Failed to send message. Please try again." error because the required database tables (`ai_tutor_conversations` and `ai_tutor_messages`) have not been created in Supabase yet.

---

## ✅ Solution: Create Database Tables

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **emvibxbcrvritkwkguya**
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Table Creation Script

Copy and paste the entire contents of **`CREATE_AI_TUTOR_TABLES.sql`** into the SQL editor and click **Run**.

This will create:
- ✅ `ai_tutor_conversations` table
- ✅ `ai_tutor_messages` table
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers to update conversation timestamps

### Step 3: Verify Tables Were Created

Run this query to confirm:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ai_tutor_conversations', 'ai_tutor_messages')
AND table_schema = 'public';
```

You should see both tables listed.

### Step 4: Test the AI Tutor

1. Restart your development server if running:
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   ```

2. Go to any lesson in CIMA Learn
3. Click the AI Tutor button (bottom right)
4. Try sending a message - it should work now! 🎉

---

## 🔍 What Was The Problem?

### Root Cause Analysis

The AI Tutor feature was implemented in the codebase but the database schema was never created in Supabase:

1. **Frontend exists**: `client/src/components/ai-tutor/` - ✅ Complete
2. **Backend API exists**: `server/routes/ai-tutor.ts` - ✅ Complete
3. **AI Service exists**: `server/services/ai-tutor.ts` - ✅ Complete
4. **DeepSeek API Key configured**: `.env` - ✅ Present
5. **Database tables**: ❌ **MISSING** (this was the issue!)

### Error Flow

```
User sends message
  → Frontend: AITutorPanel.tsx calls /api/ai-tutor/chat
  → Backend: ai-tutor.ts route processes request
  → Database: Tries to INSERT into ai_tutor_conversations
  → ERROR: Table 'ai_tutor_conversations' does not exist
  → Frontend: Shows "Failed to send message. Please try again."
```

---

## 🧪 Additional Verification

### Check Database Structure

After creating tables, verify their structure:

```sql
-- Check ai_tutor_conversations columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_tutor_conversations'
ORDER BY ordinal_position;

-- Check ai_tutor_messages columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_tutor_messages'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('ai_tutor_conversations', 'ai_tutor_messages');
```

### Test DeepSeek API Key

If tables are created but messages still fail, check the DeepSeek API:

```bash
# In your terminal
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-51255dc4b2934154bb6039f9f8a4fdda" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

If you get an error, the API key might be invalid or expired. Get a new one from: https://platform.deepseek.com/api_keys

---

## 📊 Database Schema Reference

### `ai_tutor_conversations` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | VARCHAR | References users(id) |
| course_id | UUID | References courses(id) |
| lesson_id | UUID | References lessons(id) |
| created_at | TIMESTAMPTZ | When conversation started |
| updated_at | TIMESTAMPTZ | Last update time |
| last_message_at | TIMESTAMPTZ | Last message timestamp |

### `ai_tutor_messages` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | References ai_tutor_conversations(id) |
| role | VARCHAR(20) | 'user' or 'assistant' or 'system' |
| content | TEXT | Message content |
| lesson_context | JSONB | Lesson metadata |
| tokens_used | INTEGER | AI tokens consumed |
| model | VARCHAR(50) | AI model used (e.g., 'deepseek-chat') |
| created_at | TIMESTAMPTZ | Message timestamp |

---

## 🚀 Next Steps After Fix

Once the AI Tutor is working:

1. **Test Different Lesson Types**:
   - Video lessons
   - Article lessons
   - Quiz lessons
   - Assignment lessons

2. **Try Different Questions**:
   - "Explain this concept in simpler terms"
   - "Give me a real-world example"
   - "Help me draft an arbitration clause"
   - "Grade this assignment" (paste assignment text)

3. **Check Usage Metrics** (optional):
   ```sql
   -- Count conversations
   SELECT COUNT(*) FROM ai_tutor_conversations;
   
   -- Count messages
   SELECT COUNT(*) FROM ai_tutor_messages;
   
   -- Total tokens used
   SELECT SUM(tokens_used) FROM ai_tutor_messages;
   
   -- Most active users
   SELECT user_id, COUNT(*) as message_count
   FROM ai_tutor_conversations
   GROUP BY user_id
   ORDER BY message_count DESC
   LIMIT 10;
   ```

---

## 💡 Cost Management

Monitor your DeepSeek API usage to control costs:

- **Free tier**: 500K tokens free
- **Pricing**: ~$0.14 per 1M input tokens, ~$0.28 per 1M output tokens
- **Average cost**: ~$0.85 per student per month (based on 50 messages)

Check your usage at: https://platform.deepseek.com/usage

---

## 🆘 Still Having Issues?

### Common Problems

**1. "Unauthorized" Error**
- Check that you're logged in
- Verify Supabase auth token is valid
- Check RLS policies are enabled

**2. "Rate limit exceeded" Error**
- Wait 1 hour (rate limit: 50 messages/hour per user)
- Or adjust rate limit in `server/routes/ai-tutor.ts`

**3. AI Response is Slow**
- Normal: DeepSeek API takes 2-5 seconds
- Check your internet connection
- Verify API key is valid

**4. Generic Error Message**
- Check server logs for detailed error
- Run `npm run dev` and look for console errors
- Check Supabase logs in dashboard

### Enable Debug Logging

Add this to your `.env` for more detailed logs:

```env
DEBUG=ai-tutor:*
LOG_LEVEL=debug
```

### Contact Support

If still stuck:
1. Check server console for error details
2. Check browser console (F12) for frontend errors
3. Check Supabase logs for database errors
4. Share error messages for more help

---

## ✨ Feature Overview

Once working, the AI Tutor can:

- 🎓 **Teach concepts**: Explain complex ADR topics
- 📝 **Grade assignments**: Review and provide feedback
- ❓ **Help with quizzes**: Explain correct/incorrect answers
- ✍️ **Review drafts**: Analyze arbitration clauses and agreements
- 🎯 **Practice scenarios**: Create mock cases for practice
- 📚 **Answer questions**: Contextual help based on current lesson
- 💡 **Suggest improvements**: Constructive feedback on work

The AI Tutor (Michael Smith) is context-aware and adapts to:
- Current course and lesson
- Student's level (Associate/Member/Fellow)
- Lesson type (video, article, quiz, assignment)
- Conversation history

---

**Ready to use the AI Tutor! 🚀**

Run the SQL script and start learning with AI assistance!
