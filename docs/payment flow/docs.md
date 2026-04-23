implement this flow

Post-Checkout Flow
1. Payment Processing
User completes payment via Paystack (card/mobile money)
Paystack redirects to /payment-success with transaction reference
Payment success page verifies the payment via /api/verify-payment
2. Webhook Processing
Paystack sends webhook to /api/paystack-webhook on successful payment
Webhook creates:
Order record with payment details and currency conversion info
Enrollment record with ACTIVE status and progress "0"
Activity log entry for course enrollment
Updates course enrollment count
3. User Experience
Payment Success Page displays:
Success confirmation with transaction details
Course information and amount paid
"Start Learning" button → /course/{courseId}/learn
"Go to Dashboard" button
Confirmation email notice
4. Backend Provisioning (triggered via webhook)
Logs provisioning activity
TODO: Currently incomplete - planned features:
Tiered welcome emails (Associate/Member/Fellow)
Community channel access
CRM updates
Company invoice generation
5. Immediate Access
User gets instant course access upon payment verification
Can navigate directly to course learning interface
Enrollment appears in user dashboard