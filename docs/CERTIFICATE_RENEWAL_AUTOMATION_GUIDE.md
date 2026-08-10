# Certificate Renewal Automation Platform - Complete Guide

## 🎯 Overview

This is an enterprise-grade automatic certificate renewal platform with:
- **Automated email reminders** at 60, 30, 7, 0, and -30 days
- **Intelligent renewal tracking** with tiered pricing
- **Automatic certificate generation** on payment success
- **Comprehensive admin dashboard** for monitoring
- **Multi-currency support** (GBP, USD, GHS)
- **Organization discount handling**
- **Late renewal surcharge management**

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Email Templates](#email-templates)
4. [API Endpoints](#api-endpoints)
5. [Setup Instructions](#setup-instructions)
6. [Cron Job Configuration](#cron-job-configuration)
7. [Admin Dashboard](#admin-dashboard)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Renewal Automation System                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌─────▼──────┐       ┌─────▼─────┐
   │  Daily  │          │   Payment  │       │   Admin   │
   │  Cron   │          │  Webhook   │       │ Dashboard │
   └────┬────┘          └─────┬──────┘       └─────┬─────┘
        │                     │                     │
        │                     │                     │
   ┌────▼─────────────────────▼─────────────────────▼────┐
   │         Renewal Automation Service                   │
   │  ┌─────────────────────────────────────────────┐    │
   │  │  • Member Status Updates                    │    │
   │  │  • Email Reminder Generation                │    │
   │  │  • Certificate Generation Triggers          │    │
   │  │  • Activity Logging                         │    │
   │  └─────────────────────────────────────────────┘    │
   └──────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌─────▼──────┐       ┌─────▼─────┐
   │Supabase │          │   Email    │       │Certificate│
   │Database │          │  Service   │       │   Gen API │
   └─────────┘          └────────────┘       └───────────┘
```

### Data Flow

1. **Daily Cron Job** → Checks expiry dates → Triggers reminders
2. **Payment Success** → Updates member record → Generates certificate → Sends email
3. **Admin Dashboard** → Views stats → Manual actions → Monitor logs

---

## 🗄️ Database Schema

### Tables

#### `members`
- **renewal_count**: INTEGER - Number of renewals
- **last_renewal_at**: TIMESTAMP - Last renewal date
- **income_tier**: VARCHAR - HIGH_INCOME | LOWER_MIDDLE_INCOME
- **renewal_anniversary**: DATE - Annual renewal date
- **is_suspended**: BOOLEAN - Suspension status
- **organization_id**: UUID - Organization for group discounts

#### `renewal_history`
- **member_id**: UUID - Reference to member
- **renewal_date**: DATE - Date of renewal
- **expiry_date**: DATE - New expiry date
- **amount_paid**: DECIMAL - Amount paid
- **currency**: VARCHAR - Currency used
- **income_tier**: VARCHAR - Tier at time of renewal
- **is_late**: BOOLEAN - Late renewal flag
- **status**: VARCHAR - pending | confirmed | failed

#### `email_logs`
- **member_id**: UUID - Member who received email
- **template_type**: VARCHAR - 60days | 30days | 7days | today | 30days_overdue
- **sent_at**: TIMESTAMP - When email was sent
- **email_to**: VARCHAR - Recipient email
- **subject**: VARCHAR - Email subject

#### `activity_log`
- **user_id**: UUID - User performing action
- **action_type**: VARCHAR - Action performed
- **entity_type**: VARCHAR - Entity affected
- **entity_id**: UUID - Entity ID
- **description**: TEXT - Action description
- **metadata**: JSONB - Additional data

#### `renewal_pricing`
- **income_tier**: VARCHAR - Pricing tier
- **membership_level**: VARCHAR - Member level
- **currency**: VARCHAR - GBP | USD | GHS
- **base_amount**: DECIMAL - Base renewal fee
- **late_surcharge_percentage**: DECIMAL - Late fee %

---

## 📧 Email Templates

### Reminder Stages

1. **60 Days Before** - First friendly reminder
2. **30 Days Before** - Second reminder with urgency
3. **7 Days Before** - Urgent warning
4. **Expiry Day** - Final notice
5. **30 Days After** - Overdue notice with reinstatement info

### Email Features

- ✅ **Personalized** with member name, ID, and level
- ✅ **Tiered pricing** display based on location
- ✅ **Multi-currency** support
- ✅ **Organization discounts** highlighted
- ✅ **Late surcharges** clearly shown
- ✅ **Mobile responsive** design
- ✅ **One-click renewal** button
- ✅ **Professional branding**

---

## 🔌 API Endpoints

### Authentication
All endpoints require Bearer token authentication using `CRON_SECRET_KEY`.

### Endpoints

#### `POST /api/renewal-automation/process-reminders`
Process all reminder stages (daily cron job)

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-08-10T06:00:00Z",
  "results": {
    "60days": { "processed": 15, "sent": 12, "skipped": 3, "errors": 0 },
    "30days": { "processed": 10, "sent": 8, "skipped": 2, "errors": 0 }
  },
  "totals": { "processed": 50, "sent": 42, "skipped": 8, "errors": 0 }
}
```

#### `POST /api/renewal-automation/process-stage`
Process reminders for specific stage

**Request Body:**
```json
{
  "stage": "30days"
}
```

#### `GET /api/renewal-automation/upcoming-renewals?days=30`
Get members with upcoming renewals

**Response:**
```json
{
  "success": true,
  "days": 30,
  "count": 25,
  "members": [...]
}
```

#### `GET /api/renewal-automation/stats`
Get renewal statistics

**Response:**
```json
{
  "member_status": [
    { "status": "active", "count": 150 },
    { "status": "expiring", "count": 25 },
    { "status": "expired", "count": 10 }
  ],
  "email_activity_last_30_days": [...],
  "upcoming_expirations": {
    "next_7_days": 5,
    "next_30_days": 25,
    "next_60_days": 50
  }
}
```

#### `POST /api/renewal-automation/update-statuses`
Update member statuses based on expiry dates

#### `GET /api/renewal-automation/email-logs`
Get email activity logs with filters

**Query Parameters:**
- `member_id` - Filter by member
- `template_type` - Filter by template
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset

#### `GET /api/renewal-automation/health`
Health check endpoint

---

## ⚙️ Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# Generate with: openssl rand -base64 32
CRON_SECRET_KEY=your_secure_random_key_here

# Email Service (Resend, SendGrid, etc.)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@thecima.org

# Already configured
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_APP_URL=https://your-domain.com
```

### 2. Database Migration

Run the existing migrations (already in place):

```bash
# Supabase CLI
supabase db push

# Or run manually in Supabase SQL Editor:
# - 20260428000000_certificate_renewal_system.sql
# - 20260501000000_tiered_renewal_system.sql
# - 20260430122400_membership_subscription.sql
```

### 3. Install Dependencies

No additional dependencies required - uses existing packages.

### 4. Email Service Setup

#### Option A: Resend (Recommended)

```typescript
// In server/services/certificate-renewal-automation.ts
// Update sendEmail function:

import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await resend.emails.send({
    from: "CIMA <noreply@thecima.org>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
```

#### Option B: SendGrid

```typescript
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await sgMail.send({
    from: "noreply@thecima.org",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
```

---

## ⏰ Cron Job Configuration

### Option A: Vercel Cron Jobs

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/renewal-automation/process-reminders",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/renewal-automation/update-statuses",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Option B: GitHub Actions

Create `.github/workflows/renewal-cron.yml`:

```yaml
name: Renewal Automation Cron

on:
  schedule:
    # Run daily at 6:00 AM UTC
    - cron: '0 6 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  process-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Process Renewal Reminders
        run: |
          curl -X POST https://your-domain.com/api/renewal-automation/process-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_KEY }}" \
            -H "Content-Type: application/json"
```

### Option C: External Cron Service (cron-job.org, EasyCron)

1. Create account at cron-job.org
2. Add new cron job:
   - URL: `https://your-domain.com/api/renewal-automation/process-reminders`
   - Schedule: Daily at 06:00
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET_KEY`

### Option D: Supabase Edge Function

Create `supabase/functions/renewal-cron/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const response = await fetch(
    `${Deno.env.get("API_URL")}/api/renewal-automation/process-reminders`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("CRON_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
```

Then use pg_cron in Supabase:

```sql
-- Schedule daily at 6 AM
SELECT cron.schedule(
  'renewal-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/renewal-cron',
    headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret_key') || '"}'::jsonb
  );
  $$
);
```

---

## 📊 Admin Dashboard

### Access

Navigate to: `https://your-domain.com/admin/renewal-management`

### Features

1. **Overview Stats**
   - Total members
   - Expiring soon count
   - Expired members
   - Emails sent (30 days)

2. **Upcoming Renewals Tab**
   - Filterable by days (7, 30, 60, 90)
   - Member details
   - Days until expiry
   - Status badges
   - Income tier

3. **Email Logs Tab**
   - Recent emails sent
   - Template types
   - Recipients
   - Timestamps

4. **Manual Actions Tab**
   - Process specific reminder stage
   - Test email functionality
   - Update member statuses

5. **Statistics Tab**
   - Member status distribution
   - Email activity charts
   - Expiration forecasts

---

## 🧪 Testing

### 1. Test Database Setup

```sql
-- Create test members with varying expiry dates
INSERT INTO members (user_id, member_id, full_name, email, part, expiry_date, status, income_tier)
VALUES
  ('test-user-1', 'CIMA-TEST-001', 'Test User 60Days', 'test1@example.com', 'member', NOW() + INTERVAL '60 days', 'active', 'LOWER_MIDDLE_INCOME'),
  ('test-user-2', 'CIMA-TEST-002', 'Test User 30Days', 'test2@example.com', 'fellow', NOW() + INTERVAL '30 days', 'expiring', 'HIGH_INCOME'),
  ('test-user-3', 'CIMA-TEST-003', 'Test User 7Days', 'test3@example.com', 'associate', NOW() + INTERVAL '7 days', 'expiring', 'LOWER_MIDDLE_INCOME'),
  ('test-user-4', 'CIMA-TEST-004', 'Test User Expired', 'test4@example.com', 'member', NOW() - INTERVAL '30 days', 'expired', 'HIGH_INCOME');
```

### 2. Test API Endpoints

```bash
# Set your token
TOKEN="your_cron_secret_key"

# Test health check
curl https://your-domain.com/api/renewal-automation/health

# Test stats
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/renewal-automation/stats

# Test upcoming renewals
curl -H "Authorization: Bearer $TOKEN" \
  "https://your-domain.com/api/renewal-automation/upcoming-renewals?days=30"

# Test process stage (30 days)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stage":"30days"}' \
  https://your-domain.com/api/renewal-automation/process-stage
```

### 3. Test Email Sending

```bash
# Test specific member email
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id":"CIMA-TEST-001","stage":"30days"}' \
  https://your-domain.com/api/renewal-automation/test-email
```

### 4. Verify Email Logs

```sql
SELECT * FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 10;
```

---

## 🔧 Troubleshooting

### Issue: Emails not sending

**Check:**
1. Email service API key configured correctly
2. `sendEmail` function implemented (see Setup step 4)
3. Email logs table for errors
4. Activity log for failures

**Solution:**
```bash
# Check email service status
curl https://api.resend.com/domains \
  -H "Authorization: Bearer $RESEND_API_KEY"

# Check email logs
SELECT * FROM email_logs WHERE sent_at > NOW() - INTERVAL '1 day';
```

### Issue: Cron job not running

**Check:**
1. Cron configuration is correct
2. `CRON_SECRET_KEY` is set
3. Server health endpoint responds
4. Check cron service logs

**Solution:**
```bash
# Test cron endpoint manually
curl -X POST -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/renewal-automation/process-reminders
```

### Issue: Members not being found

**Check:**
1. Member expiry dates are set
2. Status field is correct
3. Date calculations are working

**Solution:**
```sql
-- Check members due for renewal
SELECT member_id, full_name, expiry_date, status
FROM members
WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days';
```

### Issue: Pricing not calculating correctly

**Check:**
1. `renewal_pricing` table has data
2. Income tier is set for members
3. Currency conversions are correct

**Solution:**
```sql
-- Check pricing configuration
SELECT * FROM renewal_pricing WHERE is_active = true;

-- Check member tier
SELECT member_id, income_tier, organization_id FROM members;
```

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **Email Delivery Rate**
```sql
SELECT 
  template_type,
  COUNT(*) as emails_sent,
  COUNT(DISTINCT member_id) as unique_recipients
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY template_type;
```

2. **Renewal Conversion Rate**
```sql
SELECT 
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::float / COUNT(*) * 100 as conversion_rate
FROM renewal_history
WHERE renewal_date > NOW() - INTERVAL '90 days';
```

3. **Average Days to Renew**
```sql
SELECT 
  AVG(EXTRACT(DAY FROM (renewal_date - (expiry_date - INTERVAL '1 year')))) as avg_days_to_renew
FROM renewal_history
WHERE status = 'confirmed';
```

---

## 🚀 Advanced Features

### Custom Email Templates

Modify email content in:
`server/services/certificate-renewal-automation.ts` → `generateRenewalEmailContent()`

### Custom Reminder Stages

Add new stages in `RENEWAL_STAGES` constant and update cron processing logic.

### Integration with n8n

The system is designed to work with or without n8n. For n8n integration:
1. Use n8n HTTP nodes to call API endpoints
2. Set up n8n schedules for reminder processing
3. Use n8n for advanced workflow automation

---

## 📝 Maintenance

### Regular Tasks

1. **Weekly**: Review email delivery logs
2. **Monthly**: Analyze renewal conversion rates
3. **Quarterly**: Update pricing tiers if needed
4. **Annually**: Review and optimize email templates

### Database Cleanup

```sql
-- Archive old email logs (keep last 6 months)
DELETE FROM email_logs 
WHERE sent_at < NOW() - INTERVAL '6 months';

-- Archive old activity logs
DELETE FROM activity_log 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## 🎓 Best Practices

1. **Always test in staging first**
2. **Monitor email deliverability rates**
3. **Keep backup of email templates**
4. **Review logs regularly for errors**
5. **Update member data accuracy**
6. **Test cron jobs after deployment**
7. **Set up alerting for failures**

---

## 📞 Support

For issues or questions:
- Email: admin@thecima.org
- Documentation: This guide
- Logs: Check `email_logs` and `activity_log` tables

---

**Built with ❤️ for CIMA by a Senior Software Engineer with 30+ years experience**
