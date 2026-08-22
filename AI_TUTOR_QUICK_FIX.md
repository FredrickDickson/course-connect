# 🚀 AI Tutor Quick Fix

## The Problem
The AI Tutor shows: **"Failed to send message. Please try again."**

## The Cause
Database tables are missing (never created in Supabase)

## The Solution (3 steps, 2 minutes)

### 1️⃣ Diagnose (Optional)
Run `DIAGNOSE_AI_TUTOR.sql` in Supabase SQL Editor to confirm the issue.

### 2️⃣ Fix (Required)
Run `CREATE_AI_TUTOR_TABLES.sql` in Supabase SQL Editor to create tables.

### 3️⃣ Test (Verify)
Refresh your app and try sending a message to the AI Tutor. It should work! 🎉

---

## Step-by-Step Instructions

### Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select project: **emvibxbcrvritkwkguya** (CIMA Learn)
3. Click **SQL Editor** in sidebar

### Run the Fix Script
1. Click **New Query**
2. Copy ALL content from `CREATE_AI_TUTOR_TABLES.sql`
3. Paste into SQL editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for success message

### Verify It Worked
Run this quick check:
```sql
SELECT COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_name IN ('ai_tutor_conversations', 'ai_tutor_messages');
```
Should return: `total_tables: 2`

### Test the AI Tutor
1. Go to any lesson in CIMA Learn
2. Click the AI Tutor button (bottom-right, looks like "MS")
3. Type: "Hello, can you help me?"
4. Press Enter
5. ✅ Should get a response from Michael Smith!

---

## What Gets Created

- ✅ `ai_tutor_conversations` - Stores chat sessions
- ✅ `ai_tutor_messages` - Stores individual messages
- ✅ Indexes - For fast queries
- ✅ RLS Policies - Security rules
- ✅ Triggers - Auto-update timestamps

---

## Already Have Tables?

If tables exist but AI Tutor still fails:

**Check API Key:**
```bash
# Test DeepSeek API
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer sk-51255dc4b2934154bb6039f9f8a4fdda" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"test"}]}'
```

**Check Environment:**
```bash
# In your .env file
DEEPSEEK_API_KEY=your_deepseek_api_key_here  # Should be present
```

**Check Server Logs:**
```bash
npm run dev
# Look for errors in console
```

**Check Browser Console:**
- Open browser DevTools (F12)
- Look at Console tab for errors
- Look at Network tab for failed requests

---

## Still Stuck?

1. **Read Full Guide**: `FIX_AI_TUTOR_ERROR.md`
2. **Check Diagnostics**: Run `DIAGNOSE_AI_TUTOR.sql`
3. **Verify Tables**: Run `CHECK_AI_TUTOR_TABLES.sql`
4. **Check Logs**: Server console + browser console
5. **Get Help**: Share error messages

---

## What is AI Tutor?

Meet **Michael Smith** - your ADR Learning Assistant!

He can:
- 📚 Explain complex arbitration/mediation concepts
- ✍️ Grade assignments and provide feedback
- ❓ Help with quiz questions
- 📝 Review draft clauses and agreements
- 🎯 Create practice scenarios
- 💡 Answer questions about lessons

Powered by: **DeepSeek AI** (OpenAI-compatible API)

---

**That's it! Create the tables and start learning with AI assistance! 🚀**
