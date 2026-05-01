# P3: Admin Migration Guide - course_enrollments → Unified Tables

## Overview

This guide documents the migration of admin components from the deprecated `course_enrollments` table to the unified `enrollments` + `orders` tables.

## Data Mapping Reference

### course_enrollments → enrollments + orders

| course_enrollments | enrollments | orders | Notes |
|-------------------|-------------|--------|-------|
| `id` | `id` | - | Same UUID |
| `user_id` | `user_id` | `user_id` | Same value |
| `course_id` | `course_id` | `course_id` | Same value |
| `booking_ref` | - | `booking_ref` | Moved to orders |
| `ticket_type` | `enrollment_level` | - | Uppercased in enrollments |
| `ticket_price` | - | `amount` | In orders |
| `currency` | - | `currency` | In orders |
| `email` | - | `enrollment_metadata->>'email'` | JSONB in orders |
| `full_name` | - | `enrollment_metadata->>'full_name'` | JSONB in orders |
| `payment_status` | `status` | `status` | 'confirmed'→'ACTIVE'/'completed' |
| `paystack_reference` | - | `paystack_reference` | In orders |
| `created_at` | `enrolled_at` | `created_at` | Slight rename |
| `confirmed_at` | - | Inferred from order status | completed = confirmed |

## Query Pattern Changes

### Before (course_enrollments):
```typescript
const { data } = await supabase
  .from("course_enrollments")
  .select("*, course:courses(title, cohort_id)")
  .order("created_at", { ascending: false });
```

### After (unified tables):
```typescript
const { data } = await supabase
  .from("enrollments")
  .select(`
    *,
    course:courses(title, cohort_id),
    order:orders(booking_ref, amount, currency, status, enrollment_metadata)
  `)
  .order("enrolled_at", { ascending: false });
```

## Status Mapping

| course_enrollments | enrollments.status | orders.status |
|-------------------|-------------------|---------------|
| `confirmed` | `ACTIVE` | `completed` |
| `pending_bank` | `PENDING_APPROVAL` | `pending` |
| `pending_invoice` | `PENDING_APPROVAL` | `pending` |
| `cancelled` | `DROPPED` | `cancelled` |

## Component Updates Required

### 1. admin-enrollments-table.tsx
**Lines to update:** 79, 102, 125, 135, 143

**Changes needed:**
- Query from `enrollments` table with `orders` join
- Update status checks (`confirmed` → `ACTIVE`)
- Access booking_ref from `order.booking_ref`
- Access price from `order.amount`
- Access metadata from `order.enrollment_metadata`

### 2. admin-overview-stats.tsx
**Lines to update:** 44

**Changes needed:**
- Query from `enrollments` + `orders` tables
- Join on user_id + course_id
- Filter by order.status = 'completed' for revenue
- Map ticket_type to enrollment_level

### 3. admin-courses-table.tsx
**Lines to update:** (search for enrollment counts)

**Changes needed:**
- Query enrollment counts from `enrollments` table
- Join with `orders` for payment status

### 4. admin-users-profiles.tsx
**Lines to update:** (search for enrollment queries)

**Changes needed:**
- Query user's enrollments from `enrollments` table
- Join with `courses` and `orders` as needed

## New Unified Enrollment Interface

```typescript
interface UnifiedEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrollment_level: string; // 'ASSOCIATE' | 'MEMBER' | 'FELLOW'
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'DROPPED' | 'COMPLETED';
  enrolled_at: string;
  course: {
    title: string;
    cohort_id?: string;
  };
  order: {
    booking_ref: string;
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'cancelled';
    paystack_reference?: string;
    enrollment_metadata: {
      email: string;
      full_name: string;
      phone?: string;
      // ... other fields
    };
  } | null;
}
```

## Migration Verification

After updating components, verify with these SQL queries:

```sql
-- Count migrated enrollments
SELECT COUNT(*) FROM enrollments e
JOIN orders o ON o.user_id = e.user_id AND o.course_id = e.course_id;

-- Compare with old table
SELECT COUNT(*) FROM course_enrollments;

-- Check status distribution
SELECT 
  e.status as enrollment_status,
  o.status as order_status,
  COUNT(*)
FROM enrollments e
JOIN orders o ON o.user_id = e.user_id AND o.course_id = e.course_id
GROUP BY e.status, o.status;
```

## Testing Checklist

- [ ] Admin enrollments table loads correctly
- [ ] Booking refs display properly
- [ ] Payment statuses show correctly
- [ ] Revenue calculations are accurate
- [ ] Enrollment counts per course are correct
- [ ] User profile enrollment history works
- [ ] CSV export includes correct data
- [ ] Detail drawer shows all enrollment info

## Rollback Plan

If issues arise, the legacy view `course_enrollments_legacy` can be used temporarily:

```typescript
// Temporary fallback
const { data } = await supabase
  .from("course_enrollments_legacy")
  .select("*");
```

## Post-Migration Cleanup

After successful verification:
1. Drop `course_enrollments` table
2. Drop `generate_booking_ref` function
3. Drop `course_enrollments_legacy` view
4. Archive old component code
