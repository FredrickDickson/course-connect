# Certificate Renewal System - Deployment Guide

This guide covers the remaining manual steps to complete the certificate renewal system implementation.

## Completed Implementation

The following components have been implemented in the codebase:

✅ **Phase 1: Server-Side Certificate Generation API**
- Created `server/routes/certificates.ts` with POST `/api/certificates/generate` endpoint
- Registered certificates router in `server/routes/index.ts`
- Added `CERTIFICATE_API_KEY` to environment variables

✅ **Phase 3: Web App Integration with n8n Webhook**
- Updated `client/src/pages/renew-membership.tsx` to integrate with n8n webhook
- Paystack metadata now includes `type: "renewal"` for n8n workflow
- Removed local certificate generation (now handled by n8n)
- Created `server/routes/renewal.ts` for admin manual renewal webhook

✅ **Phase 4: Database Schema Updates**
- Created migration: `supabase/migrations/20260428000000_certificate_renewal_system.sql`
- Added `renewal_count` and `last_renewal_at` columns to `members` table
- Added `status` and `confirmed_at` columns to `renewal_history` table
- Created `email_logs` table for tracking reminder emails
- Created `activity_log` table for logging renewal activities

## Remaining Manual Steps

### Phase 2: Deploy and Configure n8n Workflows

#### 1. Set Up n8n Instance

**Option A: n8n Cloud (Recommended)**
1. Sign up at https://n8n.cloud
2. Create a new workspace
3. Get your n8n API key from settings

**Option B: Self-Hosted**
1. Install n8n using Docker:
   ```bash
   docker run -it --rm \
     --name n8n \
     -p 5678:5678 \
     -v ~/.n8n:/home/node/.n8n \
     n8nio/n8n
   ```
2. Access at http://localhost:5678
3. Create admin account

#### 2. Configure Credentials in n8n

Navigate to **Credentials** → **Add Credential** and configure:

**Supabase Service Role**
- Credential Type: Supabase API
- API Key: Your `SUPABASE_SERVICE_ROLE_KEY`
- API URL: Your `VITE_SUPABASE_URL`

**Resend API**
- Credential Type: Resend API
- API Key: Your `RESEND_API_KEY`

**Paystack Webhook Secret**
- Credential Type: Header Auth
- Name: Paystack Webhook Secret
- Value: Your Paystack webhook secret

**Certificate API Auth**
- Credential Type: Header Auth
- Name: Certificate API Key
- Value: Your `CERTIFICATE_API_KEY`

#### 3. Import Workflows

Import the existing workflow files from `n8n/` directory:

**WF05: Daily Renewal Reminders**
1. Import `n8n/phase1-critical/wf05-daily-renewal-reminders.json`
2. Configure:
   - Cron schedule: `0 6 * * *` (daily at 6am UTC)
   - Update Supabase credentials
   - Update Resend credentials
3. Activate workflow

**WF06: Renewal Payment → Certificate Generation**
1. Import `n8n/phase2-supporting/wf06-renewal-certificates.json`
2. Configure:
   - Webhook URL: Set to your public webhook endpoint
   - Update certificate API URL: `https://your-domain.com/api/certificates/generate`
   - Update Certificate API Auth credential
   - Update Supabase credentials
   - Update Resend credentials
   - Update email templates with correct domain
3. Activate workflow

#### 4. Update Environment Variables

Add these to your `.env` file:

```bash
# Certificate Generation API
CERTIFICATE_API_KEY=your-secure-random-string-here

# n8n Workflow Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/paystack-renewal
N8N_API_KEY=your-n8n-api-key
```

Generate a secure `CERTIFICATE_API_KEY`:
```bash
openssl rand -base64 32
```

#### 5. Configure Paystack Webhooks

In your Paystack dashboard:
1. Navigate to Settings → Webhooks
2. Add webhook URL: `https://your-n8n-instance.com/webhook/paystack-renewal`
3. Events to listen for: `charge.success`
4. Copy the webhook secret and add to n8n credentials

### Phase 5: Configure Resend Email Templates

#### Create Email Templates in Resend

Navigate to Resend dashboard → Templates → Create Template

**Template 1: 60 Days Before Expiry**
- Name: `renewal-reminder-60days`
- Subject: `CIMA Membership Renewal - 60 Days Notice`
- Use HTML from wf05 workflow or create custom template

**Template 2: 30 Days Before Expiry**
- Name: `renewal-reminder-30days`
- Subject: `CIMA Membership Renewal - 30 Days Remaining`

**Template 3: 7 Days Before Expiry**
- Name: `renewal-reminder-7days`
- Subject: `URGENT: CIMA Membership Expires in 7 Days`

**Template 4: Day of Expiry**
- Name: `renewal-reminder-today`
- Subject: `URGENT: Your CIMA Membership Expires Today`

**Template 5: 30 Days Overdue**
- Name: `renewal-reminder-overdue`
- Subject: `CIMA Membership Overdue - Action Required`

**Template 6: Renewal Confirmation**
- Name: `renewal-confirmation`
- Subject: `Membership Renewed - Download Your New Certificate`

#### Update n8n Workflows to Use Templates

In WF05 and WF06, replace inline HTML with Resend template IDs:
```javascript
{
  "from": "info@thecima.org",
  "to": "{{ $json.email }}",
  "subject": "...",
  "template_id": "renewal-reminder-60days",
  "template_data": {
    "full_name": "{{ $json.full_name }}",
    "expiry_date": "{{ $json.expiry_date }}"
  }
}
```

### Phase 6: Test Complete Renewal Flow

#### Test 1: Certificate Generation API

```bash
curl -X POST https://your-domain.com/api/certificates/generate \
  -H "Authorization: Bearer YOUR_CERTIFICATE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "TEST-001",
    "full_name": "Test User",
    "membership_level": "member",
    "issue_date": "2026-04-28",
    "expiry_date": "2027-04-28",
    "pathway": "ARBITRATION"
  }'
```

Expected response:
```json
{
  "success": true,
  "certificate_url": "https://your-project.supabase.co/storage/v1/object/public/certificates/TEST-001-2026-04-28.pdf",
  "member_id": "TEST-001",
  "filename": "certificates/TEST-001-2026-04-28.pdf"
}
```

#### Test 2: Paystack Renewal Flow

1. Navigate to `/renew` in your web app
2. Complete a test renewal payment via Paystack
3. Verify:
   - Paystack webhook triggers n8n workflow
   - Member expiry date is updated
   - Certificate is generated
   - Confirmation email is sent
   - Certificate URL is updated in database

#### Test 3: Bank Transfer Renewal Flow

1. Submit a bank transfer renewal in web app
2. Admin confirms payment via admin panel
3. Call admin webhook endpoint:
```bash
curl -X POST https://your-domain.com/api/renewal/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "uuid-here",
    "renewal_history_id": "uuid-here"
  }'
```
4. Verify renewal is processed and certificate is generated

#### Test 4: Daily Renewal Reminders

1. Manually trigger WF05 workflow in n8n
2. Verify emails are sent to members at correct thresholds
3. Check `email_logs` table in Supabase

### Phase 7: Set Up Monitoring and Maintenance

#### Configure n8n Error Notifications

1. In n8n, navigate to Settings → Error Workflow
2. Create error workflow that sends Slack/email alerts on failures
3. Configure for both WF05 and WF06

#### Set Up Supabase Logs Monitoring

1. Enable Supabase logs in dashboard
2. Monitor for:
   - Certificate generation errors
   - Storage upload failures
   - Database query errors

#### Create Admin Dashboard (Optional)

Add renewal overview to admin panel:
- Members expiring soon
- Renewal rate metrics
- Failed renewals
- Certificate generation status

## Troubleshooting

### Certificate Generation Fails

**Issue**: PDF generation returns error
**Solution**:
- Check jsPDF is installed in server dependencies
- Verify Supabase Storage bucket "certificates" exists
- Check service role key has storage permissions

### n8n Workflow Not Triggered

**Issue**: Paystack webhook not reaching n8n
**Solution**:
- Verify webhook URL is publicly accessible
- Check Paystack webhook secret matches n8n
- Check n8n workflow is active
- Review n8n execution logs

### Emails Not Sending

**Issue**: Resend emails not delivered
**Solution**:
- Verify Resend API key is valid
- Check sender domain is verified in Resend
- Review email content for spam triggers
- Check Resend dashboard for delivery status

### Database Errors

**Issue**: Migration fails or queries error
**Solution**:
- Run migration manually in Supabase SQL editor
- Check RLS policies allow service role access
- Verify table and column names match code

## Security Considerations

1. **API Keys**: Never commit `CERTIFICATE_API_KEY` to git
2. **Webhook Secrets**: Keep Paystack webhook secret secure
3. **Service Role Key**: Only use on server-side, never in client code
4. **HTTPS**: Ensure all webhook URLs use HTTPS
5. **Rate Limiting**: Consider adding rate limiting to certificate API

## Support Resources

- n8n Documentation: https://docs.n8n.io
- Resend Documentation: https://resend.com/docs
- Supabase Documentation: https://supabase.com/docs
- Paystack Documentation: https://paystack.com/docs

## Next Steps After Deployment

1. Monitor workflow executions for first 24-48 hours
2. Review email delivery rates
3. Check certificate generation success rate
4. Gather user feedback on renewal process
5. Adjust reminder timing based on renewal patterns
