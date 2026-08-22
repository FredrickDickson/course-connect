# Vercel Deployment Fix Guide

## Issue
Deployment is failing on Vercel due to missing environment variables.

## Root Cause
The build script (`check-env.js`) validates that all required environment variables are present before building. If any are missing, the build fails with exit code 1.

## Solution for Repository Owner

### Step 1: Add Environment Variables in Vercel Dashboard

Go to your Vercel project settings → Environment Variables and add the following:

#### Required Variables:
```
VITE_SUPABASE_URL=https://emvibxbcrvritkwkguya.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_aCasNKB6_GbuTAK6yTGqBA_95zG6X-c
VITE_SUPABASE_PROJECT_ID=emvibxbcrvritkwkguya
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
DATABASE_URL=<your_database_url>
SESSION_SECRET=<generate_a_random_32_char_string>
PAYSTACK_SECRET_KEY=<your_paystack_secret>
VITE_PAYSTACK_PUBLIC_KEY=<your_paystack_public_key>
FRONTEND_URL=<your_vercel_url>
```

#### Optional but Recommended:
```
BREVO_API_KEY=<your_brevo_key>
EMAIL_FROM=<your_email>
EMAIL_FROM_NAME=CIMA Learn
INTERNAL_API_KEY=<generate_random_string>
CRON_SECRET_KEY=<generate_random_string>
ZOOM_ACCOUNT_ID=<your_zoom_account_id>
ZOOM_CLIENT_ID=<your_zoom_client_id>
ZOOM_CLIENT_SECRET=<your_zoom_client_secret>
DEEPSEEK_API_KEY=<your_deepseek_key>
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
```

### Step 2: Set Environment Variable Scope
Make sure to select:
- ✅ Production
- ✅ Preview  
- ✅ Development

### Step 3: Redeploy
After adding all variables, trigger a new deployment by:
1. Going to the Deployments tab
2. Click the three dots menu on the latest deployment
3. Select "Redeploy"

## Build Configuration Verification

Verify in Vercel project settings → General:

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`
- **Node.js Version**: `20.x` or `18.x`

## Recent Code Fixes Applied

1. ✅ Fixed missing `formatDistanceToNow` import in `session-detail.tsx`
2. ✅ Fixed `import.meta.dirname` compatibility issue in `vite.config.ts`
3. ✅ Updated `vercel.json` framework setting
4. ✅ Added Live Sessions to mobile navigation

## Contact

If issues persist after adding environment variables, please check the Vercel deployment logs in the dashboard for specific error messages.
