# Post-Checkout Flow Test Plan

## Test Scenarios

### 1. Payment Success Flow
- [ ] User completes payment via Paystack
- [ ] Redirect to `/payment-success?reference=xxx`
- [ ] Payment verification API creates all required records:
  - [ ] Order record with payment details
  - [ ] Enrollment record with ACTIVE status
  - [ ] Activity log entry for course enrollment
  - [ ] Course enrollment count increment
- [ ] Success page displays correctly with transaction details
- [ ] "Start Learning" button navigates to course learning interface
- [ ] "Go to Dashboard" button works

### 2. Webhook Processing
- [ ] Paystack webhook receives charge.success event
- [ ] Webhook processes payment and creates records
- [ ] Provisioning triggers complete:
  - [ ] Welcome email logged
  - [ ] Community access granted
  - [ ] CRM update queued
  - [ ] Company invoice generated (if applicable)
- [ ] All activities logged in activity_log table

### 3. Error Handling
- [ ] Invalid payment reference handled gracefully
- [ ] Payment verification failure shows error message
- [ ] Network errors handled appropriately
- [ ] Duplicate enrollment prevented

### 4. Database Records Verification
Check these tables after successful payment:

#### orders table
```sql
SELECT * FROM orders WHERE paystack_reference = 'test_ref';
```
Should contain:
- user_id, course_id, amount, currency
- paystack_reference, status = "completed"
- Currency conversion details (amount_usd, amount_ghs, exchange_rate)

#### enrollments table
```sql
SELECT * FROM enrollments WHERE user_id = 'xxx' AND course_id = 'xxx';
```
Should contain:
- user_id, course_id, status = "ACTIVE"
- progress = "0", enrollment_type = "COURSE"
- payment_reference, payment_amount, payment_currency

#### activity_log table
```sql
SELECT * FROM activity_log WHERE user_id = 'xxx' ORDER BY created_at DESC;
```
Should contain entries for:
- course_enrolled
- provisioning_completed
- email_sent
- community_access_granted
- crm_update_queued
- company_invoice_generated (if applicable)

#### courses table
```sql
SELECT enrollment_count FROM courses WHERE id = 'xxx';
```
Should be incremented by 1

## Test Data

### Required Environment Variables
```
PAYSTACK_SECRET_KEY=your_test_key
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Test Payment Flow
1. Use test course ID
2. Use Paystack test card: `4084084084084081`
3. Verify all database records created
4. Check webhook processing logs

## API Endpoints Testing

### POST /api/verify-payment
```bash
curl -X POST \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"reference": "test_ref"}' \
  https://your-domain.com/api/verify-payment
```

Expected response:
```json
{
  "success": true,
  "message": "Payment verified and enrollment created",
  "data": { /* Paystack payment data */ }
}
```

### POST /api/paystack-webhook
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: <signature>" \
  -d '{"event": "charge.success", "data": {...}}' \
  https://your-domain.com/api/paystack-webhook
```

Expected response: `200 OK`

## Frontend Testing

### Payment Success Page
- [ ] Loads correctly with reference parameter
- [ ] Shows loading state during verification
- [ ] Displays success message with transaction details
- [ ] Navigation buttons work correctly
- [ ] Responsive design works on mobile

### Error States
- [ ] No reference parameter shows error
- [ ] Invalid reference shows error
- [ ] Payment verification failed shows error
- [ ] Network errors handled gracefully

## Integration Points

### Email Service Integration
- [ ] Configure SendGrid or similar service
- [ ] Test email templates for different enrollment levels
- [ ] Verify email delivery

### Community Platform Integration
- [ ] Set up Discord/Slack bot
- [ ] Test channel addition functionality
- [ ] Verify user permissions

### CRM Integration
- [ ] Configure CRM API endpoints
- [ ] Test data sync
- [ ] Verify contact creation/update

## Performance Considerations
- [ ] Webhook processing completes within 30 seconds
- [ ] Database queries optimized with proper indexes
- [ ] API responses under 2 seconds
- [ ] Error handling doesn't expose sensitive information

## Security Checklist
- [ ] Webhook signature verification enabled
- [ ] JWT token validation working
- [ ] SQL injection prevention
- [ ] Rate limiting on API endpoints
- [ ] Sensitive data not logged
