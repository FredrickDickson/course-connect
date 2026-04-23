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