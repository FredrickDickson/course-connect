# CIMA n8n Workflows

Complete automation infrastructure for CIMA Learn platform enrollment, membership, courses, community, and admin operations.

## Overview

39 workflows organized into 9 implementation phases, covering all critical business operations for the CIMA course platform.

## Implementation Phases

### Phase 1: Critical Workflows (Week 1)
Core business operations - **build first**

- **WF01**: Payment confirmed -> full enrollment flow
- **WF05**: Daily renewal reminder sequence (60/30/7/0/-30 days)
- **WF16**: Daily admin briefing - enrollments, revenue, expiries

### Phase 2: Supporting Workflows (Week 2)
Essential supporting operations

- **WF03**: Admin mark-as-paid confirmation
- **WF04**: Course full -> waitlist cascade
- **WF17**: Failed payment retry prompt
- **WF09**: 7-day course joining instructions
- **WF06**: Renewal payment -> certificate generation

### Phase 3: Course Management (Week 3)
Course operations

- **WF10**: Course end -> feedback survey
- **WF11**: New course -> member notifications
- **WF12**: Course 90% full -> admin alert

### Phase 4: Community (Week 4)
Community engagement

- **WF13**: Community post -> AI moderation
- **WF14**: @mention notifications
- **WF15**: Weekly community digest

### Phase 5: AI Features (Week 5)
Advanced AI-powered features

- **WF21**: MCQ auto-grading
- **WF22**: AI written assessment grader
- **WF23**: AI instructor auto-replies
- **WF24**: Mock arbitration simulator
- **WF25**: Old student database import
- **WF26**: Old student renewals (handled by WF05)
- **WF27**: AI assignment feedback agent

### Phase 6: Instructor & Revenue (Week 6)
Instructor management and revenue operations

- **WF28**: Instructor application notification workflow
- **WF29**: Instructor payout calculation & processing
- **WF30**: Assignment deadline & grading reminders

### Phase 7: User Engagement (Week 7)
User onboarding and engagement automation

- **WF31**: User onboarding & welcome sequence
- **WF32**: Email verification reminders
- **WF33**: Certificate expiry reminders

### Phase 8: Course Operations (Week 8)
Course lifecycle automation

- **WF34**: Course publishing notifications
- **WF35**: Course content update alerts
- **WF36**: Quiz deadline reminders

### Phase 9: Community & Retention (Week 9)
Community engagement and user retention

- **WF37**: Inactive user re-engagement
- **WF38**: Forum unanswered question reminders
- **WF39**: Review collection automation

## Required Credentials

### Services
- **Supabase**: Service role key for database operations
- **Paystack**: Webhook secret for payment verification
- **Resend**: API key for email sending
- **Slack**: Bot token for admin notifications
- **WhatsApp Business**: API for group invites and alerts
- **OpenAI**: API key for AI moderation and grading
- **Google Sheets**: For monthly reports (optional)

### Setup Instructions

1. **Supabase Setup**
   ```sql
   -- Enable webhooks for required tables
   CREATE OR REPLACE FUNCTION trigger_enrollment_webhook()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Webhook logic handled by n8n
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Paystack Webhook URLs**
   - Success: `https://n8n.yourdomain.com/webhook/paystack-payment`
   - Failed: `https://n8n.yourdomain.com/webhook/paystack-failed`

3. **Environment Variables**
   ```
   PAYSTACK_WEBHOOK_SECRET=your_secret_here
   ADMIN_WHATSAPP_NUMBER=233XXXXXXXXX
   OPENAI_API_KEY=sk-...
   ```

## Import Instructions

### Method 1: Direct Import
1. Open n8n instance
2. Go to "Workflows" > "Import from file"
3. Select JSON files from phase folders
4. Configure credentials
5. Activate workflows

### Method 2: API Import
```bash
# Import all Phase 1 workflows
curl -X POST "https://n8n.yourdomain.com/api/v1/workflows/import" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@phase1-critical/wf01-payment-enrollment.json"
```

## File Structure

```
/n8n/
README.md
phase1-critical/
  wf01-payment-enrollment.json
  wf05-daily-renewal-reminders.json
  wf16-daily-admin-briefing.json
phase2-supporting/
  wf03-admin-mark-paid.json
  wf04-waitlist-cascade.json
  wf17-failed-payment-retry.json
  wf09-course-joining-instructions.json
  wf06-renewal-certificates.json
phase3-courses/
  wf10-course-feedback.json
  wf11-new-course-notifications.json
  wf12-capacity-alerts.json
phase4-community/
  wf13-ai-moderation.json
  wf14-mention-notifications.json
  wf15-weekly-digest.json
phase5-ai/
  wf21-mcq-grading.json
  wf22-ai-written-grading.json
  wf23-ai-instructor-replies.json
  wf24-mock-arbitration.json
  wf25-student-import.json
  wf26-old-renewals.json
  wf27-ai-feedback.json
phase6-instructor-revenue/
  wf28-instructor-application-notifications.json
  wf29-instructor-payout-processing.json
  wf30-assignment-reminders.json
phase7-user-engagement/
  wf31-user-onboarding.json
  wf32-email-verification-reminders.json
  wf33-certificate-expiry-reminders.json
phase8-course-operations/
  wf34-course-publishing-notifications.json
  wf35-course-update-alerts.json
  wf36-quiz-deadline-reminders.json
phase9-community-retention/
  wf37-inactive-user-re-engagement.json
  wf38-forum-unanswered-reminders.json
  wf39-review-collection.json
```

## Testing & Validation

### Pre-deployment Checklist
- [ ] All credentials configured
- [ ] Webhook endpoints accessible
- [ ] Database permissions verified
- [ ] Email templates reviewed
- [ ] Error handling tested

### Test Scenarios
1. **Payment Flow**: Test Paystack webhook -> enrollment -> confirmation email
2. **Renewal Flow**: Test renewal reminder -> payment -> certificate generation
3. **Failed Payment**: Test failure webhook -> retry email
4. **Course Management**: Test course creation -> notifications

## Monitoring

### Key Metrics
- Workflow execution success rate
- Email delivery rates
- Payment processing time
- Error frequency by workflow

### Alerts
- Failed payment webhook retries
- Database connection issues
- Email sending failures
- AI API rate limits

## Security Notes

- All webhooks verify HMAC signatures
- Database uses service role with limited permissions
- API keys stored in n8n credentials manager
- No sensitive data in workflow JSON files
- Regular security audits via n8n audit tool

## Support

For issues with:
- **Workflow Logic**: Check node configurations and connections
- **Credentials**: Verify API keys and permissions
- **Database**: Check Supabase RLS policies
- **External APIs**: Monitor service status pages

## Cost Estimates

**Monthly n8n Cloud (recommended)**: ~$8-15
- 39 workflows x ~30 executions/day
- ~1,200 executions/month
- Well within free tier limits

**Self-hosted**: Server costs only (~$5-15/month)
- Docker deployment recommended
- Automated backups essential
- SSL certificates required for webhooks

---

**Next Steps**: Start with Phase 1 workflows, test thoroughly, then proceed to subsequent phases. Each phase builds on previous infrastructure.
