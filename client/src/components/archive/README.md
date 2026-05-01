# Component Archive

This folder contains legacy components that have been replaced during the unified enrollment system migration.

## Archived Components

### `admin-enrollments-table.tsx.legacy`
**Replaced by:** `../admin-enrollments-unified.tsx`  
**Date:** 2026-04-26  
**Reason:** Migrated from `course_enrollments` table to unified `enrollments` + `orders` tables

### `progression-banner.tsx.legacy`
**Replaced by:** `../dashboard/progression-ladder.tsx`  
**Date:** 2026-04-26  
**Reason:** Enhanced with visual ladder showing full certification path

### `course-card.tsx.legacy` (if exists)
**Replaced by:** `../course-card-status.tsx`  
**Date:** 2026-04-26  
**Reason:** Added eligibility states, lock/unlock, and course type display

## Retention Policy

These files are kept for **90 days** as an emergency rollback option.  
**Delete after:** July 26, 2026  

If no issues have been reported by then, these files can be safely deleted.

## How to Restore

If a critical issue requires reverting to a legacy component:

1. Copy the `.legacy` file back to the parent directory
2. Remove the `.legacy` extension
3. Update imports in the consuming file
4. Redeploy

Example:
```bash
cd client/src/components
cp archive/admin-enrollments-table.tsx.legacy admin-enrollments-table.tsx
# Update admin-dashboard.tsx to import the legacy version
```

## Migration Context

See the full migration documentation:
- `/docs/P0_IMPLEMENTATION_SUMMARY.md`
- `/docs/P1_IMPLEMENTATION_SUMMARY.md`
- `/docs/P2_IMPLEMENTATION_SUMMARY.md`
- `/docs/P3_IMPLEMENTATION_SUMMARY.md`
- `/docs/FINAL_CLEANUP_SUMMARY.md`
