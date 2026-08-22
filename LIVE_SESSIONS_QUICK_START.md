# 🚀 Live Sessions - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Zoom Credentials (2 minutes)

1. Go to [https://marketplace.zoom.us/develop/create](https://marketplace.zoom.us/develop/create)
2. Click **"Build App"** → **"Server-to-Server OAuth"**
3. Fill in:
   - **App Name**: CIMA Learn Live Sessions
   - **Company Name**: Your Organization
   - **Developer Contact**: Your Email
4. Click **Continue**
5. On the **App Credentials** page, copy:
   - Account ID
   - Client ID
   - Client Secret
6. Go to **Scopes** tab and add:
   - `meeting:write:admin`
   - `meeting:read:admin`
   - `user:read:admin`
   - `recording:read:admin` (optional)
7. Click **Continue** → **Activate**

### Step 2: Configure Environment (30 seconds)

Open your `.env` file and add:

```bash
ZOOM_ACCOUNT_ID=your-account-id-here
ZOOM_CLIENT_ID=your-client-id-here
ZOOM_CLIENT_SECRET=your-client-secret-here
```

### Step 3: Run Database Migration (1 minute)

```bash
# Option 1: Copy and paste in Supabase SQL Editor
# Open CREATE_LIVE_SESSIONS_TABLES.sql
# Copy all contents → Paste in Supabase → Run

# Option 2: Use Supabase CLI
supabase db push CREATE_LIVE_SESSIONS_TABLES.sql
```

### Step 4: Restart Server (30 seconds)

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 5: Test It! (1 minute)

1. **Login as Instructor/Admin**
2. **Go to Dashboard** → Click "Schedule Live Session"
3. **Fill form**:
   - Title: "Test Session"
   - Type: Lecture
   - Date: Tomorrow
   - Time: 10:00 AM
   - Duration: 1 hour
4. **Click "Schedule Session"**
5. ✅ **Done!** Check your dashboard for the new session

---

## 📍 Where to Find Features

### For Students
- **Dashboard** → "Upcoming Live Sessions" card (right sidebar)
- **Navigation** → "Sessions" link
- **Sessions Page** → `/sessions`

### For Instructors
- **Instructor Dashboard** → "Schedule Live Session" button (top right)
- **Sessions Page** → Create and manage your sessions
- **View registrations** → Click any session to see participants

### For Admins
- **Admin Dashboard** → "Schedule Live Session" button (top right)
- **Manage all sessions** → Edit or cancel any session
- **View all participants** → Full platform analytics

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] **Create session button appears** on instructor/admin dashboard
- [ ] **Schedule a test session** (should create Zoom meeting)
- [ ] **Session appears on dashboard** in "Upcoming Sessions" card
- [ ] **Students can register** for the session
- [ ] **Registration count updates** in real-time
- [ ] **Can view session details** by clicking on session
- [ ] **Join button appears** 15 minutes before start time
- [ ] **Clicking join** opens Zoom in new tab

---

## 🐛 Quick Troubleshooting

### "Live sessions feature is not configured"
→ Add Zoom credentials to `.env` and restart server

### Session not appearing
→ Check RLS policies - students must be enrolled in linked course (or session must be public)

### Can't join meeting
→ Join button only appears 15 minutes before start time

### Zoom API error
→ Verify all 3 credentials are correct and app is activated

---

## 🎉 You're Done!

Your live sessions feature is ready for production use!

**Next Steps:**
- Schedule real sessions for your courses
- Invite students to register
- Join your first live session
- Check attendance after session completes

**Need Help?**
See `LIVE_SESSIONS_IMPLEMENTATION_GUIDE.md` for detailed documentation.
