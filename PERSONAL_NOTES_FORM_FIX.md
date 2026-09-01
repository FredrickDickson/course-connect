# Personal Notes Form API 404 Fix Guide

## Problem
The personal notes form is returning a **404 (Not Found)** error when trying to submit at `https://cimalearn.thecima.org/api/personal-notes-forms`.

## Root Cause
The `vercel.json` had incorrect rewrite rules that were preventing Vercel from properly routing requests to the serverless API functions.

## Changes Made

### 1. ✅ Fixed vercel.json
- **Removed** incorrect rewrite rules for `/api/` routes (Vercel handles these automatically)
- Kept only the catch-all rewrite for client-side routing: `/:path((?!api|assets).*) → /index.html`

### 2. ✅ Updated Build Scripts
- Added `copy-api.js` script to copy the `/api/` folder to the dist directory during build
- Updated `package.json` build commands to run this script
- This ensures API files are available at: `dist/api/personal-notes-forms/index.ts`

### 3. ✅ Created Cross-Platform Copy Script
- Created `scripts/copy-api.js` to handle API folder copying on Windows, macOS, and Linux

## Deployment Steps

### Step 1: Verify Supabase Configuration
Make sure your Supabase credentials are set in the environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Verify Storage Bucket Exists
The API expects a Supabase Storage bucket named `personal-notes-forms`. 

**Verify it exists:**
```sql
SELECT * FROM storage.buckets WHERE id = 'personal-notes-forms';
```

**If it doesn't exist, create it:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('personal-notes-forms', 'personal-notes-forms', false);
```

### Step 3: Push Changes to GitHub
```bash
git add .
git commit -m "Fix personal-notes-forms API 404 error - remove incorrect rewrite rules"
git push origin main
```

### Step 4: Check Vercel Deployment
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Wait for automatic deployment (2-3 minutes)
3. Check the deployment logs for any errors

### Step 5: Verify API Endpoint
Test the endpoint manually in your browser console:

```javascript
fetch('/api/personal-notes-forms', {
  method: 'POST',
  body: new FormData(document.querySelector('form'))
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Environment Variables Needed on Vercel

Add these to your Vercel project settings (Settings → Environment Variables):

**Required:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Optional but Recommended:**
- `BREVO_API_KEY` (for email notifications)
- `PAYSTACK_SECRET_KEY` (for payments)

## Troubleshooting

### Still Getting 404?
1. **Check build output**: Verify that the `dist/api/` folder exists after running `npm run build`
2. **Check Vercel logs**: Look at the deployment logs in Vercel dashboard for error messages
3. **Check environment variables**: Ensure all required env vars are set on Vercel
4. **Redeploy**: Trigger a new deployment manually from Vercel dashboard

### Database Insert Fails?
- Verify `personal_notes_forms` table exists in Supabase
- Verify the service role key has write permissions
- Check Supabase logs for detailed error messages

### Storage Upload Fails?
- Verify `personal-notes-forms` bucket exists
- Verify service role key has write permissions to the bucket
- Check bucket permissions in Supabase Storage settings

## API Endpoint Details

**Endpoint:** `POST /api/personal-notes-forms`
**Authentication:** Public (no auth required)
**Expected Response:**
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "id": "uuid"
}
```

**Error Response:**
```json
{
  "error": "Error description"
}
```

## Files Modified
- ✅ `vercel.json` - Removed incorrect rewrite rules
- ✅ `package.json` - Updated build scripts
- ✅ `scripts/copy-api.js` - Created new cross-platform copy script

## Next Steps
1. Commit and push these changes
2. Verify deployment on Vercel
3. Test the form submission
4. If issues persist, check the Vercel logs and Supabase configuration
