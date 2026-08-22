# Vercel Environment Variables Setup

## Required Variables

Your Vercel deployment is failing because required environment variables are not set.

## Quick Fix Steps:

### 1. Go to Vercel Dashboard
Visit: https://vercel.com

### 2. Select Your Project
Navigate to: **course-connect** project

### 3. Go to Settings → Environment Variables
Click on **Settings** in the top menu, then **Environment Variables** in the sidebar

### 4. Add These Required Variables:

Copy these from your local `.env` file and paste them in Vercel:

#### Supabase (REQUIRED)
```
VITE_SUPABASE_URL=<your-value>
VITE_SUPABASE_ANON_KEY=<your-value>
VITE_SUPABASE_PROJECT_ID=<your-value>
SUPABASE_SERVICE_ROLE_KEY=<your-value>
DATABASE_URL=<your-value>
```

#### Application (REQUIRED)
```
SESSION_SECRET=<your-value>
FRONTEND_URL=https://your-production-domain.com
NODE_ENV=production
```

#### Payment (REQUIRED)
```
PAYSTACK_SECRET_KEY=<your-value>
VITE_PAYSTACK_PUBLIC_KEY=<your-value>
```

#### Currency
```
USD_TO_GHS_RATE=11
VITE_USD_TO_GHS_RATE=11
```

### 5. Optional But Recommended:

#### Zoom (for Live Sessions)
```
ZOOM_ACCOUNT_ID=<your-value>
ZOOM_CLIENT_ID=<your-value>
ZOOM_CLIENT_SECRET=<your-value>
```

#### AI Tutor
```
DEEPSEEK_API_KEY=<your-value>
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

#### Email (Brevo)
```
BREVO_API_KEY=<your-value>
EMAIL_FROM=<your-email>
EMAIL_FROM_NAME=CIMA Learn
```

### 6. Environment Selection
For each variable, select which environments need it:
- ✅ **Production** (main branch)
- ✅ **Preview** (PR branches)
- ⬜ **Development** (local only)

### 7. Redeploy
After adding all variables:
1. Go to **Deployments** tab
2. Click the **3 dots** on the latest deployment
3. Click **Redeploy**

## Alternative: Use Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables (production)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... repeat for each variable

# Or pull from .env
vercel env pull
```

## Verification

Once variables are set:
1. The deployment should automatically trigger
2. Build should pass ✅
3. Both Production and Preview should show green checkmarks

## Common Issues:

**Issue**: "Missing environment variable"
**Fix**: Make sure the variable name is EXACTLY as shown (case-sensitive)

**Issue**: "Build still failing"
**Fix**: Check that FRONTEND_URL matches your actual Vercel domain

**Issue**: "API requests failing"
**Fix**: Verify Supabase variables are correct and service role key has proper permissions

## Need Help?

If you continue to see errors, check the Vercel deployment logs:
1. Go to Deployments tab
2. Click on the failed deployment
3. Click "View Function Logs" or "Build Logs"
4. Share the error message for specific help
