The exchange rate can be updated in two files:

Server-side
server/utils/currency.ts - Line 8

typescript
export const EXCHANGE_RATE = 15.50; // 1 USD = 15.50 GHS
Client-side
c:\Users\Administrator\Documents\projects\course-connect/client/src/utils/currency.ts - Line 8

typescript
export const EXCHANGE_RATE = 15.50; // 1 USD = 15.50 GHS
Update Process
Edit both files with the new rate
Redeploy Edge Functions if needed:
bash
supabase functions deploy paystack-course-initialize
supabase functions deploy paystack-webhook
The rate is hardcoded for simplicity but could be moved to environment variables or a database table for dynamic updates.

Feedback submitted



You need to update in both:

Vercel Environment Variables (for server and client):

USD_TO_GHS_RATE=11 - Used by server/routes.ts and server/utils/currency.ts
VITE_USD_TO_GHS_RATE=11 - Used by client/src/utils/currency.ts (browser)
Supabase Edge Function Secrets (for the Edge Function):

USD_TO_GHS_RATE=11 - Used by supabase/functions/paystack-course-initialize/index.ts
To set Supabase Edge Function secrets, run:

bash
supabase secrets set USD_TO_GHS_RATE=11
Or via Supabase dashboard: Project Settings → Edge Functions → Secrets.