-- ============================================================================
-- FINAL CLEANUP: Drop legacy course_enrollments table and related objects
-- Run this AFTER verifying unified enrollment system works correctly
-- ============================================================================

-- IMPORTANT: Verify counts match before running this migration
-- Run this first to confirm:
/*
SELECT 
  'Legacy' as source, 
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE payment_status = 'confirmed') as confirmed
FROM course_enrollments
UNION ALL
SELECT 
  'Unified Enrollments',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'ACTIVE')
FROM enrollments;
*/

-- ============================================================================
-- Step 1: Drop dependent objects
-- ============================================================================

-- Drop triggers on course_enrollments
DROP TRIGGER IF EXISTS course_enrollments_updated_at ON course_enrollments;

-- Drop the updated_at trigger function if only used by this table
-- (Keep if other tables use it)
-- DROP FUNCTION IF EXISTS update_course_enrollments_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_course_enrollments_course_id;
DROP INDEX IF EXISTS idx_course_enrollments_user_id;
DROP INDEX IF EXISTS idx_course_enrollments_email;
DROP INDEX IF EXISTS idx_course_enrollments_payment_status;
DROP INDEX IF EXISTS idx_course_enrollments_created_at;
DROP INDEX IF EXISTS idx_course_enrollments_booking_ref;

-- Drop policies
DROP POLICY IF EXISTS "Allow users to view their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Allow users to insert their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Allow users to update their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Allow admins full access to course_enrollments" ON course_enrollments;

-- ============================================================================
-- Step 2: Archive data (optional - create backup table)
-- ============================================================================

-- Create archive table with timestamp
CREATE TABLE IF NOT EXISTS course_enrollments_archive AS 
SELECT *, '2026-04-26' as archived_at 
FROM course_enrollments 
WHERE FALSE;

-- Copy data to archive (only if not already archived)
INSERT INTO course_enrollments_archive
SELECT *, '2026-04-26' 
FROM course_enrollments ce
WHERE NOT EXISTS (
  SELECT 1 FROM course_enrollments_archive ca 
  WHERE ca.id = ce.id
);

-- ============================================================================
-- Step 3: Drop the legacy table
-- ============================================================================

-- Disable RLS first
ALTER TABLE course_enrollments DISABLE ROW LEVEL SECURITY;

-- Drop the table
DROP TABLE IF EXISTS course_enrollments CASCADE;

-- ============================================================================
-- Step 4: Drop legacy functions
-- ============================================================================

-- Drop booking reference generator (unified system uses orders.booking_ref)
DROP FUNCTION IF EXISTS generate_booking_ref();

-- Drop any course_enrollments specific functions
DROP FUNCTION IF EXISTS get_course_enrollment_stats(uuid);

-- ============================================================================
-- Step 5: Update the legacy view to show archived data only
-- (Provides backward compatibility for emergency queries)
-- ============================================================================

DROP VIEW IF EXISTS course_enrollments_legacy;

CREATE VIEW course_enrollments_legacy AS
SELECT 
  e.id,
  e.user_id,
  e.course_id,
  o.booking_ref,
  LOWER(e.enrollment_level) as ticket_type,
  o.amount as ticket_price,
  o.currency,
  (o.enrollment_metadata->>'email') as email,
  (o.enrollment_metadata->>'full_name') as full_name,
  (o.enrollment_metadata->>'country') as country,
  (o.enrollment_metadata->>'phone') as phone,
  (o.enrollment_metadata->>'whatsapp') as whatsapp,
  (o.enrollment_metadata->>'institution') as institution,
  (o.enrollment_metadata->>'address') as address,
  (o.enrollment_metadata->>'programme_selected') as programme_selected,
  (o.enrollment_metadata->>'personal_statement') as personal_statement,
  (o.enrollment_metadata->>'payment_method') as payment_method,
  CASE 
    WHEN o.status = 'completed' THEN 'confirmed'
    WHEN o.status = 'pending' THEN 'pending_bank'
    WHEN o.status = 'cancelled' THEN 'cancelled'
    ELSE o.status
  END as payment_status,
  o.paystack_reference,
  (o.enrollment_metadata->>'admin_notes') as admin_notes,
  e.enrolled_at as created_at,
  CASE WHEN o.status = 'completed' THEN o.updated_at END as confirmed_at,
  (o.enrollment_metadata->>'invoice_expiry_date')::timestamp as invoice_expiry_date
FROM enrollments e
LEFT JOIN orders o ON o.id = e.order_id;

-- Add comment explaining the view
COMMENT ON VIEW course_enrollments_legacy IS 
'Backward compatibility view mapping unified tables to legacy schema. 
Use enrollments + orders tables directly for new code.';

-- ============================================================================
-- Step 6: Grant appropriate permissions on the view
-- ============================================================================

GRANT SELECT ON course_enrollments_legacy TO authenticated;
GRANT SELECT ON course_enrollments_legacy TO anon;

-- ============================================================================
-- Step 7: Archive table for emergency recovery
-- ============================================================================

-- Archive table is kept for emergency recovery
-- To be dropped after 90 days of stable operation

COMMENT ON TABLE course_enrollments_archive IS 
'Archived data from legacy course_enrollments table. 
Can be deleted after 2026-07-26 if no issues reported.';

-- ============================================================================
-- Verification Query (run after migration)
-- ============================================================================

/*
-- Verify view works
SELECT COUNT(*) FROM course_enrollments_legacy;

-- Compare with archive
SELECT COUNT(*) FROM course_enrollments_archive;

-- Check unified tables
SELECT 
  'Enrollments' as table_name, COUNT(*) as count
FROM enrollments
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders;
*/
