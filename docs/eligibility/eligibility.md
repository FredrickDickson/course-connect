current flow 





## 🎯 Complete ENROLL Button UI/UX Flow

### **Phase 1: Enrollment Form (Multi-step)**

```text
User clicks "Enroll" on course page
    ↓
/enroll/:courseId opens
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Personal Info                                      │
│  • Full Name, Email, DOB, Gender, Nationality               │
│  • Country, City, Phone, WhatsApp, Address                │
│  [Continue →]                                               │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Professional Profile                               │
│  • Job Title, Organisation                                  │
│  • Professional Background, Highest Qualification           │
│  • Years of Experience, LinkedIn, Referral Source           │
│  [Continue →]                                               │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Review & Agreements                                │
│  • Course details summary                                   │
│  • ☑ I confirm information is accurate                    │
│  • ☑ I agree to terms & conditions                        │
│  • ☑ I consent to be contacted                            │
│  • ☑ I understand payment is required                     │
│                                                             │
│  [SUBMIT ENROLLMENT]  ←── User clicks this                 │
└─────────────────────────────────────────────────────────────┘
```

### **Phase 2: Eligibility Check (on handleSubmit)**

```text
Click [SUBMIT ENROLLMENT]
    ↓
POST /api/enrollments/check-eligibility
    ↓
Backend checks:
  1. Is user already enrolled? → BLOCKED "Already enrolled"
  2. Is course ASSOCIATE level? → ELIGIBLE (skip level check)
  3. Is user's level < required? → BLOCKED "Complete previous level"
  4. Does course require approval? → REQUIRES_APPROVAL
  5. Otherwise → ELIGIBLE
    ↓
┌─────────────────────────────────────────────────────────────┐
│  IF ELIGIBLE:                                               │
│    • Save profile to database                               │
│    • Store form data in sessionStorage                      │
│    • Redirect to /checkout/:courseId                        │
│                                                             │
│  IF BLOCKED:                                                │
│    • Show toast with reason                                 │
│    • Display blocking message (e.g., "Complete Associate")  │
│    • [Go to Dashboard] or [View Pathway] buttons            │
│                                                             │
│  IF REQUIRES_APPROVAL:                                      │
│    • Show "Approval needed" message                         │
│    • [Submit Application] button                            │
└─────────────────────────────────────────────────────────────┘
```

### **Phase 3: Checkout Page**

```text
/checkout/:courseId loads
    ↓
┌─────────────────────────────────────────────────────────────┐
│  ORDER SUMMARY                                              │
│  • Course name, level, price                                │
│  • Payment method selection:                              │
│    ○ Pay with Card/Mobile Money (Paystack)                │
│    ○ Bank Transfer (disabled/todo)                        │
│                                                             │
│  [PAY GHS XXX.XX]  ←── User clicks this                   │
└─────────────────────────────────────────────────────────────┘
    ↓
Call paystack-course-initialize Edge Function
    ↓
Paystack returns authorization_url
    ↓
Redirect to Paystack payment page (external)
```

### **Phase 4: Payment & Webhook**

```text
User completes payment on Paystack
    ↓
Paystack redirects to callback URL + reference
    ↓
Webhook fires: charge.success
    ↓
Backend processing:
  1. Create order record in database
  2. Create ACTIVE enrollment
  3. Log activity "course_enrolled"
  4. Trigger n8n automation (email confirmation, CRM update)
    ↓
User sees success page OR redirected to dashboard with success toast
```

### **Error Handling Flows**

| Scenario | What Happens |
|----------|--------------|
| **Already enrolled** | Toast: "You're already enrolled" + [Go to Dashboard] button |
| **Level too low** | Toast: "Complete Associate first" + redirect to pathway |
| **Needs approval** | Toast: "Approval needed" + [Submit Application] button |
| **Payment fails** | Stay on checkout, error toast, can retry |
| **Network error** | Error toast, can retry |

### **Key Files in Flow**

| Step | File | Purpose |
|------|------|---------|
| Enrollment UI | `@/client/src/components/enrollment-form.tsx` | Multi-step form + eligibility check |
| Eligibility API | `@/api/enrollments/check-eligibility.ts` | Serverless function validation |
| Eligibility Logic | `@/server/storage/enrollment.ts` | Core eligibility rules |
| Checkout UI | `@/client/src/pages/checkout.tsx` | Payment selection + Paystack init |
| Payment Init | `@/supabase/functions/paystack-course-initialize/index.ts` | Create Paystack transaction |
| Webhook | `@/supabase/functions/paystack-webhook/index.ts` | Handle successful payment |
| Enrollment Route | `@/server/routes/enrollments.ts` | Express route for enrollment |

### **Database Changes During Flow**

```
1. profiles → Upsert user profile
2. orders → Create order record (on payment success)
3. enrollments → Create ACTIVE enrollment
4. activity_log → Log enrollment event
5. n8n automation → Email confirmation triggered
```

