# Admin-as-Instructor Capability - Complete Implementation Plan

## 🎯 Executive Summary

Enable admins to act as instructors on behalf of other instructors, including:
- Create/edit courses for any instructor
- Manage instructor profiles and bios
- Build course curriculum
- Upload course content
- Issue announcements
- Full CRUD operations on courses (Professional & Adjunct)
- Switch between admin and instructor contexts seamlessly

## 📋 Current State Analysis

### Existing Instructor Capabilities
1. **Dashboard** (`/instructor`) - View courses, stats, analytics
2. **Create Course** (`/instructor/courses/new`) - Full course creation form
3. **Edit Course** (`/instructor/courses/:id/edit`) - Update course details
4. **Curriculum Builder** (`/instructor/courses/:id/curriculum`) - Build modules/lessons
5. **Community Management** - Assigned forum boards, moderator actions

### Current Limitations
- ❌ Admins can't access instructor routes (role protection blocks them)
- ❌ No way to select "on behalf of" an instructor
- ❌ No instructor profile management by admin
- ❌ No centralized instructor management UI

## 🏗️ Architecture Plan

### 1. Database Layer

#### New Tables/Columns Needed:

```sql
-- Add acting_on_behalf_of to track admin actions
ALTER TABLE courses 
ADD COLUMN created_by_admin_id uuid REFERENCES users(id),
ADD COLUMN last_edited_by_admin_id uuid REFERENCES users(id);

-- Instructor profiles table (if not exists)
CREATE TABLE IF NOT EXISTS instructor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE NOT NULL,
  bio TEXT,
  title VARCHAR(255),
  expertise TEXT[],
  education TEXT,
  certifications TEXT,
  website_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  profile_image_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_instructor_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) NOT NULL,
  instructor_id uuid REFERENCES users(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'CREATE_COURSE', 'EDIT_COURSE', 'DELETE_COURSE', etc.
  resource_type VARCHAR(50), -- 'COURSE', 'PROFILE', 'CURRICULUM'
  resource_id uuid,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Backend API Layer

#### New/Updated Endpoints:

```typescript
// Admin instructor management endpoints
GET    /api/admin/instructors                    // List all instructors
GET    /api/admin/instructors/:id                // Get instructor details
PUT    /api/admin/instructors/:id/profile        // Update instructor profile
POST   /api/admin/instructors/:id/courses        // Create course for instructor
PUT    /api/admin/instructors/:id/courses/:courseId // Update course for instructor
DELETE /api/admin/instructors/:id/courses/:courseId // Delete course for instructor

// Instructor profile endpoints
GET    /api/instructor/profile                   // Get own profile
PUT    /api/instructor/profile                   // Update own profile

// Modified course endpoints (support admin context)
POST   /api/instructor/courses?onBehalfOf=:instructorId
PUT    /api/instructor/courses/:id?onBehalfOf=:instructorId
```

### 3. Frontend Component Layer

#### New Components:

```
client/src/components/admin/
├── instructor-selector.tsx          // Dropdown to select instructor
├── instructor-profile-form.tsx      // Edit instructor profile
├── instructor-list.tsx              // Manage all instructors
├── admin-course-creator.tsx         // Course creation with instructor context
└── admin-course-context-switcher.tsx // Visual indicator of current context
```

#### New Pages:

```
client/src/pages/
├── admin-instructors.tsx            // Main instructor management page
├── admin-instructor-profile.tsx     // Edit specific instructor
├── admin-create-course.tsx          // Create course for instructor
└── admin-instructor-courses.tsx     // View/manage instructor's courses
```

## 🎨 UI/UX Flow

### Flow 1: Admin Manages Instructors

```
Admin Dashboard
├─ Tab: "Instructors"
   ├─ List of all instructors (with search/filter)
   ├─ Actions per instructor:
   │  ├─ View Profile
   │  ├─ Edit Profile (bio, image, expertise, etc.)
   │  ├─ View Courses (list of their courses)
   │  ├─ Create Course (for this instructor)
   │  └─ Manage Content
   └─ Create New Instructor User (form)
```

### Flow 2: Admin Creates Course for Instructor

```
Admin Dashboard → Instructors Tab
└─ Select Instructor → Click "Create Course"
   └─ Course Creation Form (identical to instructor's)
      ├─ All same fields (title, subtitle, category, etc.)
      ├─ Visual indicator: "Creating as [Instructor Name]"
      ├─ Preview instructor profile shown in card
      └─ Save → Redirects to Curriculum Builder (admin context)
```

### Flow 3: Admin Builds Curriculum

```
Course List (Admin View)
└─ Click "Edit Curriculum" on any course
   └─ Curriculum Builder (same as instructor's)
      ├─ Add Modules
      ├─ Add Lessons (video, quiz, text, assignment)
      ├─ Upload content directly
      ├─ Reorder items
      └─ Publish changes
```

### Flow 4: Admin Edits Instructor Profile

```
Admin Dashboard → Instructors Tab
└─ Select Instructor → Click "Edit Profile"
   └─ Profile Form:
      ├─ Profile Image Upload
      ├─ Full Name
      ├─ Title (e.g., "Senior Arbitrator")
      ├─ Bio (rich text editor)
      ├─ Expertise Areas (multi-select)
      ├─ Education
      ├─ Certifications
      ├─ Social Links (LinkedIn, Website)
      └─ Save → Updates instructor profile
```

## 🔐 Security & Authorization

### Permission Model:

```typescript
// server/middleware/permissions.ts
export async function checkAdminInstructorAccess(
  req: Request,
  instructorId: string
): Promise<boolean> {
  const user = req.user;
  
  // Admin can act on behalf of any instructor
  if (user.role === 'admin') {
    // Log the action for audit
    await logAdminAction({
      adminId: user.id,
      instructorId,
      action: req.method,
      path: req.path
    });
    return true;
  }
  
  // Instructor can only manage their own content
  if (user.role === 'instructor' && user.id === instructorId) {
    return true;
  }
  
  return false;
}
```

### Audit Trail:

Every admin action is logged:
```typescript
{
  adminId: "uuid",
  instructorId: "uuid",
  actionType: "CREATE_COURSE",
  resourceType: "COURSE",
  resourceId: "course-uuid",
  details: {
    courseTitle: "Advanced Arbitration",
    changes: {...}
  },
  timestamp: "2026-08-09T00:00:00Z"
}
```

## 🛠️ Implementation Steps

### Phase 1: Database & Backend (Priority 1)

**Files to Create/Modify:**
1. `migrations/XXXX_add_instructor_profiles.sql`
2. `migrations/XXXX_add_admin_audit_log.sql`
3. `server/routes/admin/instructors.ts` (NEW)
4. `server/routes/instructor/profile.ts` (NEW)
5. `server/middleware/adminInstructorAuth.ts` (NEW)
6. `shared/schema.ts` (add instructor profile schemas)

**Tasks:**
- [ ] Create `instructor_profiles` table
- [ ] Create `admin_instructor_actions` audit log
- [ ] Add admin instructor management endpoints
- [ ] Add instructor profile endpoints
- [ ] Implement permission middleware
- [ ] Add audit logging utility

### Phase 2: Admin UI Components (Priority 2)

**Files to Create:**
1. `client/src/components/admin/instructor-selector.tsx`
2. `client/src/components/admin/instructor-profile-form.tsx`
3. `client/src/components/admin/instructor-list.tsx`
4. `client/src/components/admin/admin-context-badge.tsx`
5. `client/src/pages/admin-instructors.tsx`
6. `client/src/pages/admin-instructor-profile.tsx`

**Tasks:**
- [ ] Create instructor list component with search/filter
- [ ] Create instructor selector dropdown
- [ ] Create instructor profile form (bio, image, expertise)
- [ ] Add "Instructors" tab to admin dashboard
- [ ] Add instructor management page routes

### Phase 3: Course Creation/Editing (Priority 3)

**Files to Modify:**
1. `client/src/pages/create-course.tsx` (add admin context support)
2. `client/src/pages/course-curriculum.tsx` (add admin context support)
3. `server/routes/instructor/courses.ts` (add `onBehalfOf` parameter)
4. `client/src/hooks/useRoleProtection.ts` (add admin bypass)

**Tasks:**
- [ ] Modify course creation to accept `onBehalfOf` parameter
- [ ] Add visual indicator showing admin is acting as instructor
- [ ] Update role protection to allow admin access to instructor routes
- [ ] Add instructor selector to course creation flow
- [ ] Modify curriculum builder to support admin context

### Phase 4: Profile Management UI (Priority 4)

**Files to Create:**
1. `client/src/pages/instructor-profile-edit.tsx`
2. `client/src/components/instructor/profile-preview.tsx`
3. `client/src/components/instructor/profile-image-uploader.tsx`

**Tasks:**
- [ ] Create instructor profile editing page
- [ ] Create profile preview component
- [ ] Add image upload for instructor profiles
- [ ] Add rich text editor for bio
- [ ] Add multi-select for expertise areas

### Phase 5: Testing & QA (Priority 5)

**Files to Create:**
1. `e2e/specs/admin/admin-instructor-management.spec.ts`
2. `e2e/specs/admin/admin-course-creation.spec.ts`
3. `e2e/specs/admin/admin-curriculum-builder.spec.ts`

**Tests to Write:**
- [ ] Admin can view all instructors
- [ ] Admin can edit instructor profile
- [ ] Admin can create course for instructor
- [ ] Admin can edit course curriculum
- [ ] Admin can upload course content
- [ ] Admin can delete courses
- [ ] Audit logs are created correctly
- [ ] Permissions are enforced properly

## 📊 Detailed Component Specs

### Component: InstructorSelector

```typescript
interface InstructorSelectorProps {
  value?: string;
  onChange: (instructorId: string) => void;
  label?: string;
}

// Features:
// - Searchable dropdown of all instructors
// - Shows instructor name, email, and profile image
// - Filters by name or email
// - Displays instructor verification badge
```

### Component: InstructorProfileForm

```typescript
interface InstructorProfileFormProps {
  instructorId: string;
  isAdmin?: boolean;
}

// Fields:
// - Profile Image (upload or URL)
// - Full Name
// - Title/Position
// - Bio (Textarea with markdown support)
// - Expertise Areas (Multi-select chips)
// - Education (Textarea)
// - Certifications (Textarea)
// - Website URL
// - LinkedIn URL
// - Verification Status (Admin only)
```

### Component: AdminContextBadge

```typescript
interface AdminContextBadgeProps {
  instructorId: string;
  instructorName: string;
}

// Visual indicator shown when admin is acting as instructor:
// [🛡️ Acting as: John Doe | Switch Context]
```

## 🎯 User Stories

### US-1: Admin Views All Instructors
**As an** admin  
**I want to** view a list of all instructors  
**So that** I can manage their profiles and courses  

**Acceptance Criteria:**
- Admin can see list of all instructors with profiles
- List shows name, email, courses count, students count
- Search/filter by name, email, or specialty
- Click to view full profile

### US-2: Admin Creates Course for Instructor
**As an** admin  
**I want to** create a course on behalf of an instructor  
**So that** I can help instructors get started or manage their content  

**Acceptance Criteria:**
- Admin selects instructor from dropdown
- Admin sees course creation form (identical to instructor's)
- Visual indicator shows "Creating as [Instructor Name]"
- Course is attributed to selected instructor
- Admin action is logged in audit trail

### US-3: Admin Edits Instructor Profile
**As an** admin  
**I want to** edit an instructor's profile including bio and image  
**So that** instructor profiles are complete and professional  

**Acceptance Criteria:**
- Admin can upload profile image
- Admin can edit bio, title, expertise
- Admin can add education and certifications
- Admin can add social links
- Changes are saved and visible on instructor's public profile

### US-4: Admin Manages Course Curriculum
**As an** admin  
**I want to** build and edit course curriculum for any instructor  
**So that** courses have complete content ready for students  

**Acceptance Criteria:**
- Admin can access curriculum builder for any course
- Admin can add/edit/delete modules and lessons
- Admin can upload videos, documents, and other content
- Admin can reorder curriculum items
- Admin can publish/unpublish courses

### US-5: Admin Issues Course Announcements
**As an** admin  
**I want to** send announcements for any course  
**So that** students receive important updates  

**Acceptance Criteria:**
- Admin can access announcement creation for any course
- Admin can write announcement content
- Admin can schedule or send immediately
- Students enrolled in course receive announcement
- Announcement shows admin as sender (on behalf of instructor)

## 🧪 Testing Strategy

### Unit Tests
- Instructor profile CRUD operations
- Admin permission checks
- Audit log creation
- Course creation with `onBehalfOf` parameter

### Integration Tests
- Admin creates course for instructor → Course appears in instructor's list
- Admin edits profile → Changes visible on public profile
- Admin deletes course → Course removed from database
- Audit trail captures all admin actions

### E2E Tests (Playwright)
```typescript
// e2e/specs/admin/admin-instructor-management.spec.ts

test.describe('Admin Instructor Management', () => {
  test('Admin can view all instructors', async ({ page }) => {
    // Login as admin
    // Navigate to Admin Dashboard → Instructors tab
    // Verify instructor list is displayed
    // Verify search functionality works
  });

  test('Admin can edit instructor profile', async ({ page }) => {
    // Login as admin
    // Select an instructor
    // Click "Edit Profile"
    // Update bio, image, expertise
    // Save changes
    // Verify changes are persisted
  });

  test('Admin can create course for instructor', async ({ page }) => {
    // Login as admin
    // Select instructor from dropdown
    // Fill course creation form
    // Verify "Creating as [Instructor]" badge
    // Submit form
    // Verify course created and attributed to instructor
  });

  test('Admin can build curriculum for instructor course', async ({ page }) => {
    // Login as admin
    // Navigate to instructor's course
    // Click "Edit Curriculum"
    // Add module and lessons
    // Upload content
    // Publish
    // Verify curriculum is live
  });

  test('Audit log captures admin actions', async ({ page }) => {
    // Perform admin action (create course)
    // Query audit log via admin panel
    // Verify action is logged with correct details
  });
});
```

## 📈 Success Metrics

### Functionality Metrics
- ✅ Admin can perform 100% of instructor actions
- ✅ All admin actions are logged in audit trail
- ✅ No permissions bypass errors
- ✅ Zero data leakage between instructors

### Performance Metrics
- Instructor list loads < 500ms
- Profile updates save < 200ms
- Course creation completes < 1s
- Curriculum builder loads < 1s

### UX Metrics
- Context switching is clear and obvious
- No confusion about which context admin is in
- Smooth transitions between admin and instructor views

## 🚀 Deployment Plan

### Stage 1: Database Migration
1. Run migration scripts in staging
2. Test with sample data
3. Verify rollback procedures
4. Run in production during maintenance window

### Stage 2: Backend Deployment
1. Deploy new API endpoints
2. Deploy permission middleware
3. Deploy audit logging
4. Smoke test all endpoints

### Stage 3: Frontend Deployment
1. Deploy new admin components
2. Deploy updated instructor pages
3. Deploy routing changes
4. Verify admin dashboard loads correctly

### Stage 4: Integration Testing
1. Run full E2E test suite
2. Perform manual QA
3. Test with real admin and instructor accounts
4. Verify audit logs

### Stage 5: Rollout
1. Enable feature for select admins (beta)
2. Collect feedback
3. Fix any issues
4. Enable for all admins

## 🔄 Rollback Plan

If critical issues are found:
1. Disable admin instructor routes (feature flag)
2. Revert database migration (if necessary)
3. Roll back to previous frontend version
4. Investigate and fix issues
5. Re-deploy with fixes

## 📝 Documentation

### For Admins:
- User guide: "Managing Instructors as an Admin"
- Video tutorial: "Creating Courses on Behalf of Instructors"
- FAQ: "Admin Instructor Capabilities"

### For Developers:
- API documentation for new endpoints
- Database schema documentation
- Permission model explanation
- Audit log format specification

---

## ✅ Definition of Done

- [ ] All database tables created and migrated
- [ ] All API endpoints implemented and tested
- [ ] All frontend components created and styled
- [ ] Admin dashboard has "Instructors" tab
- [ ] Admin can view/edit all instructor profiles
- [ ] Admin can create courses for any instructor
- [ ] Admin can build curriculum for any course
- [ ] Admin can upload course content
- [ ] Admin can issue announcements
- [ ] All actions are audited
- [ ] E2E tests pass at 100%
- [ ] Performance metrics met
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] Deployed to production

---

**Estimated Effort:** 3-4 weeks (1 senior full-stack engineer)

**Priority:** High - Critical for content management workflow

**Dependencies:** None (self-contained feature)

**Risks:**
- Permission model complexity
- Audit log storage growth
- Context switching UX confusion

**Mitigation:**
- Comprehensive testing of permission checks
- Implement audit log rotation/archival
- Clear visual indicators of current context
