# n8n Workflow Configuration Guide

This document outlines the steps required to configure the n8n workflows for the CIMA Learn platform.

## Prerequisites

1. **n8n Instance**: Set up an n8n instance (self-hosted or cloud)
2. **Credentials**: Configure the following credentials in n8n:
   - Supabase (Service role key)
   - Paystack (Webhook secret)
   - Resend (API key)
   - Slack (Bot token)
   - WhatsApp Business (API)
   - OpenAI (API key)
   - Google Sheets (optional, for reports)

## Configuration Steps

### Phase 1: Critical Workflows (Priority)

1. **WF01: Payment confirmed -> full enrollment flow**
   - Import: `n8n/phase1-critical/wf01-payment-enrollment.json`
   - Configure: Paystack webhook endpoint
   - Configure: Supabase credentials for enrollment creation
   - Configure: Resend email template for enrollment confirmation
   - Test: Trigger with a test payment

2. **WF05: Daily renewal reminder sequence**
   - Import: `n8n/phase1-critical/wf05-daily-renewal-reminders.json`
   - Configure: Supabase query for upcoming renewals
   - Configure: Resend email templates for 60/30/7/0/-30 day reminders
   - Configure: Cron trigger for daily execution
   - Test: Manually trigger to verify email sending

3. **WF16: Daily admin briefing**
   - Import: `n8n/phase1-critical/wf16-daily-admin-briefing.json`
   - Configure: Supabase queries for enrollments, revenue, expiries
   - Configure: Slack webhook for admin notifications
   - Configure: Cron trigger for daily execution
   - Test: Manually trigger to verify Slack notification

### Phase 2: Supporting Workflows

4. **WF03: Admin mark-as-paid confirmation**
   - Import: `n8n/phase2-supporting/wf03-admin-mark-paid.json`
   - Configure: Supabase webhook trigger on enrollment updates
   - Configure: Resend email for payment confirmation

5. **WF04: Course full -> waitlist cascade**
   - Import: `n8n/phase2-supporting/wf04-waitlist-cascade.json`
   - Configure: Supabase webhook on enrollment changes
   - Configure: Resend email for waitlist notifications

6. **WF06: Renewal payment -> certificate generation**
   - Import: `n8n/phase2-supporting/wf06-renewal-certificates.json`
   - Configure: Paystack webhook for renewal payments
   - Configure: Supabase for certificate creation
   - Configure: Resend email for certificate delivery

### Phase 3: Course Management

7. **WF10: Course end -> feedback survey**
   - Import: `n8n/phase3-courses/wf10-course-feedback.json`
   - Configure: Supabase webhook on course completion
   - Configure: Resend email for feedback survey

8. **WF11: New course -> member notifications**
   - Import: `n8n/phase3-courses/wf11-new-course-notifications.json`
   - Configure: Supabase webhook on course creation
   - Configure: Resend email for course announcements

9. **WF12: Course capacity alerts**
   - Import: `n8n/phase3-courses/wf12-course-capacity-alerts.json`
   - Configure: Supabase webhook on enrollment changes
   - Configure: Slack webhook for admin alerts

## Branding Requirements

All email notifications sent through n8n workflows must include:
- CIMA logo in header
- CIMA brand colors (#610000 primary, #D4AF37 accent)
- Professional email signature
- Consistent email templates

## Webhook Endpoints

Configure the following webhook endpoints in n8n:
- Paystack payment webhooks
- Supabase database triggers
- Custom API endpoints for enrollment updates

## Testing Checklist

For each workflow:
- [ ] Import workflow JSON
- [ ] Configure all credentials
- [ ] Set up webhook endpoints
- [ ] Configure cron triggers (if applicable)
- [ ] Test with sample data
- [ ] Verify email notifications are branded
- [ ] Verify Slack notifications (if applicable)
- [ ] Enable production workflow

## Notes

- The n8n workflows are already designed and documented in the JSON files
- Configuration requires access to the n8n instance and external service credentials
- Email templates should be stored in the `email-templates/` directory for reference
- All workflows should be tested in a staging environment before production deployment
