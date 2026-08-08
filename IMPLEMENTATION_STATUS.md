# Admin-as-Instructor Implementation Status

## Current Status: PLANNED ✅

## Completed Items

### Documentation
- ✅ **ADMIN_INSTRUCTOR_CAPABILITY_PLAN.md** - Complete implementation plan (3-4 weeks)
- ✅ **migrations/20260809_add_instructor_profiles.sql** - Database schema ready

### Database Schema
- ✅ `instructor_profiles` table designed
- ✅ `admin_instructor_actions` audit log designed  
- ✅ Admin tracking columns for courses designed
- ✅ RLS policies defined
- ✅ Indexes for performance

## Next Steps (Priority Order)

### Phase 1: Backend Foundation (Week 1)
1. **Run database migration**
   ```bash
   # Apply migration to Supabase
   psql -h [host] -U postgres -d postgres -f migrations/20260809_add_instructor_profiles.sql
   ```

2. **Create backend routes** (`server/routes/admin/instructors.ts`)
   - GET `/api/admin/instructors` - List all instructors
   - GET `/api/admin/instructors/:id` - Get instructor details  
   - PUT `/api/admin/instructors/:id/profile` - Update instructor profile
   - POST `/api/admin/instructors/:id/courses` - Create course for instructor

3. **Create audit logging utility** (`server/utils/admin-audit-log.ts`)
   ```typescript
   export async function logAdminAction(params: {
     adminId: string;
     instructorId: string;
     actionType: string;
     resourceType?: string;
     resourceId?: string;
     details?: any;
   })
   ```

### Phase 2: Admin UI (Week 2)
1. **Add "Instructors" tab to admin dashboard**
   - Modify `client/src/pages/admin-dashboard.tsx`
   - Add tab between "Users" and "Overview"

2. **Create instructor list component**
   - File: `client/src/components/admin/instructor-list.tsx`
   - Show: Name, Email, Courses Count, Students Count, Actions
   - Search/filter functionality

3. **Create instructor profile editor**
   - File: `client/src/components/admin/instructor-profile-form.tsx`
   - Fields: Bio, Title, Expertise, Image, Links

### Phase 3: Course Creation for Instructor (Week 3)
1. **Add instructor selector to course creation**
   - Modify `client/src/pages/create-course.tsx`
   - Add dropdown to select instructor (admin only)
   - Visual badge showing "Creating as [Instructor]"

2. **Update course API to accept `onBehalfOf`**
   - Modify `server/routes/instructor/courses.ts`
   - Accept optional `onBehalfOf` query parameter
   - Log admin action to audit trail

3. **Update curriculum builder**
   - Modify `client/src/pages/course-curriculum.tsx`
   - Allow admin access with instructor context
   - Show context badge

### Phase 4: Testing (Week 4)
1. **Write Playwright E2E tests**
   - `e2e/specs/admin/admin-instructor-management.spec.ts`
   - Test admin viewing instructors
   - Test admin editing profiles
   - Test admin creating courses
   - Test admin building curriculum

2. **Manual QA checklist**
   - [ ] Admin can view all instructors
   - [ ] Admin can edit instructor bio/image
   - [ ] Admin can create course for instructor
   - [ ] Course shows correct instructor
   - [ ] Admin can build curriculum
   - [ ] Audit log captures actions
   - [ ] No permission leaks

## Testing Requirements

### Critical Paths to Test
1. **Admin → Instructors Tab → View List** ✓
2. **Admin → Edit Instructor Profile → Save** ✓
3. **Admin → Create Course → Select Instructor → Save** ✓
4. **Admin → Course Curriculum → Add Content** ✓
5. **Verify Audit Log** ✓

### Playwright Test Coverage
```typescript
// Required test scenarios
test('Admin can view all instructors')
test('Admin can search/filter instructors')
test('Admin can edit instructor profile with image')
test('Admin can create professional course for instructor')
test('Admin can create adjunct course for instructor')
test('Admin can build course curriculum')
test('Admin can upload course content')
test('Admin can publish course')
test('Instructor sees course in their dashboard')
test('Audit log records all admin actions')
```

## Known Issues / Blockers

### None Currently

## Security Considerations

1. **Admin bypass in role protection** - Already implemented ✅
   - `useRoleProtection` allows admin to access instructor routes

2. **Audit logging** - To implement
   - All admin actions must be logged
   - No silent modifications

3. **RLS policies** - Defined in migration
   - Admins can access all instructor data
   - Instructors can only access their own

## Performance Considerations

1. **Instructor list pagination** - Add when > 100 instructors
2. **Audit log rotation** - Archive after 90 days
3. **Image uploads** - Use CDN for instructor profile images

## Deployment Checklist

- [ ] Run database migration in staging
- [ ] Test with sample data
- [ ] Deploy backend API changes
- [ ] Deploy frontend changes
- [ ] Run E2E tests in staging
- [ ] Manual QA pass
- [ ] Deploy to production (maintenance window)
- [ ] Monitor audit logs
- [ ] Verify no permission issues

## Estimated Timeline

- **Backend + DB**: 1 week
- **Admin UI**: 1 week
- **Course Integration**: 1 week
- **Testing + QA**: 1 week
- **Total**: ~4 weeks (1 engineer)

## Current Blocked Items

**None** - Ready to proceed with Phase 1

## Notes for Developer

- Migration file is ready - just needs to be run
- Role protection already supports admin bypass
- Existing course creation/curriculum pages are well-structured
- Main work is adding UI for instructor selection
- Backend changes are minimal (mostly new endpoints)

---

**Last Updated**: 2026-08-09  
**Status**: Planning Complete, Ready for Implementation  
**Assigned To**: TBD  
**Priority**: High
