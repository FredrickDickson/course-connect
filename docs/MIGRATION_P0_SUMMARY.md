# P0 Migration Summary: Unified Enrollment System

## ✅ Completed Tasks

### 1. Database Migration Script
**File:** `supabase/migrations/20260426_migrate_course_enrollments_to_unified.sql`

#### What it does:
- **Adds columns to `orders` table:**
  - `booking_ref` (TEXT UNIQUE) - for backward compatibility
  - `enrollment_metadata` (JSONB) - stores full profile snapshot
  - Currency conversion fields: `amount_usd`, `amount_ghs`, `exchange_rate`, etc.

- **Migrates confirmed (paid) enrollments:**
  - Creates records in `enrollments` table with status = 'ACTIVE'
  - Creates corresponding `orders` records with status = 'completed'
  - Preserves all historical data in `enrollment_metadata` JSONB

- **Migrates pending enrollments:**
  - Bank transfer and invoice pending → `enrollments` with 'PENDING_APPROVAL'
  - Creates `orders` records with status = 'pending'

- **Creates legacy view:** `course_enrollments_legacy`
  - Allows admin queries to continue working during transition
  - Joins `enrollments` + `orders` to simulate old table structure

### 2. Frontend: Removed Inline Paystack Popup
**File:** `client/src/components/enrollment-form.tsx`

#### Changes made:
- **Removed:** Paystack inline script loading (`window.PaystackPop.setup`)
- **Removed:** Inline popup payment flow
- **Replaced with:** Redirect to unified `/checkout/:courseId` flow

#### New behavior:
```
User fills form → Eligibility check → Save profile → 
Store form data in sessionStorage → Redirect to /checkout/:courseId
```

### 3. Frontend: Checkout Integration
**File:** `client/src/pages/checkout.tsx`

#### Changes made:
- Added `useEffect` to read `sessionStorage` data from enrollment-form.tsx
- Pre-populates checkout with form data when redirected
- Clears sessionStorage after reading to prevent stale data

## 📊 Data Mapping

### course_enrollments → enrollments + orders

| course_enrollments | enrollments | orders |
|-------------------|-------------|--------|
| user_id | user_id | user_id |
| course_id | course_id | course_id |
| ticket_type | enrollment_level | - |
| ticket_price | - | amount |
| currency | - | currency |
| payment_status='confirmed' | status='ACTIVE' | status='completed' |
| payment_status='pending_bank' | status='PENDING_APPROVAL' | status='pending' |
| booking_ref | - | booking_ref |
| email, phone, etc. | - | enrollment_metadata (JSONB) |
| paystack_reference | - | paystack_reference |
| created_at | enrolled_at | created_at |

## 🔄 Unified Flow Diagram

```
Before (Fragmented):
┌─────────────────┐     ┌──────────────────┐
│ enrollment-form │────▶│ course_enrollments│
│ (inline popup)  │     │ (Paystack direct)│
└─────────────────┘     └──────────────────┘
        │
        ▼
┌─────────────────┐
│ checkout.tsx    │────▶│ enrollments + orders │
│ (redirect)      │     │ (webhook-based)      │
└─────────────────┘     └──────────────────────┘

After (Unified):
┌─────────────────┐     ┌───────────────┐     ┌────────────────────────┐
│ enrollment-form │────▶│ /checkout/:id │────▶│ enrollments + orders   │
│ (form only)     │     │ (Paystack init)│     │ (webhook creates both) │
└─────────────────┘     └───────────────┘     └────────────────────────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │ payment-success│
                                               │ (verify + go)  │
                                               └──────────────┘
```

## ⚠️ Post-Migration Steps

### 1. Run the migration:
```bash
# Apply the SQL migration
supabase db push

# Or run locally:
psql $DATABASE_URL -f supabase/migrations/20260426_migrate_course_enrollments_to_unified.sql
```

### 2. Verify migration worked:
```sql
-- Check counts
SELECT 
  (SELECT COUNT(*) FROM course_enrollments) as old_count,
  (SELECT COUNT(*) FROM enrollments WHERE id IN (
    SELECT e.id FROM enrollments e 
    JOIN orders o ON o.user_id = e.user_id AND o.course_id = e.course_id
    WHERE o.enrollment_metadata->>'migrated_from' = 'course_enrollments'
  )) as migrated_count,
  (SELECT COUNT(*) FROM orders WHERE enrollment_metadata->>'migrated_from' = 'course_enrollments') as migrated_orders;
```

### 3. After verification, drop old table:
```sql
-- ONLY after confirming migration worked
DROP TABLE public.course_enrollments CASCADE;
DROP FUNCTION public.generate_booking_ref CASCADE;
DROP VIEW public.course_enrollments_legacy;
```

### 4. Update admin queries:
Change any admin components that query `course_enrollments` to use the unified tables:
```typescript
// Before:
const { data } = await supabase
  .from('course_enrollments')
  .select('*');

// After:
const { data } = await supabase
  .from('enrollments')
  .select(`
    *,
    orders:orders(course_id, booking_ref, enrollment_metadata)
  `)
  .eq('orders.enrollment_metadata->>migrated_from', 'course_enrollments');
```

## 🧪 Testing Checklist

- [ ] New enrollment via enrollment-form.tsx redirects to checkout
- [ ] Checkout flow completes with Paystack redirect
- [ ] Webhook creates enrollment + order correctly
- [ ] Payment success page verifies and redirects properly
- [ ] Historical data accessible via legacy view
- [ ] Admin can see migrated enrollments in dashboard
- [ ] Eligibility checks work correctly with unified tables

## 📝 Known Issues

1. **Lint error:** `@shared/eligibility-engine` module not found - pre-existing issue, not related to migration
2. **Admin queries:** Some admin components may still reference `course_enrollments` - update needed in Phase 2

## 🚀 Next Steps (P1)

1. Add course card lock/unlock states
2. Create enrollment gate modal
3. Update admin components to use unified tables
4. Full regression testing
