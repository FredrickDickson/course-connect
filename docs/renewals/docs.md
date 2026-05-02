Required Manual Steps
Run database migration - Apply the SQL migration to Supabase
Generate and set environment variables - Add CERTIFICATE_API_KEY, N8N_WEBHOOK_URL, N8N_API_KEY to your .env
Set up n8n - Deploy and configure WF05 (daily reminders) and WF06 (payment processing) workflows
Configure Resend templates - Create email templates for reminders and confirmations
Configure Paystack webhooks - Point Paystack webhook to your n8n instance
Test the system - Verify certificate generation, renewal flow, and email delivery
See docs/certificate-renewal-deployment-guide.md for detailed step-by-step instructions.