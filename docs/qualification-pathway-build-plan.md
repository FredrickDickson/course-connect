# Qualification Pathway System - Build Plan

## Overview
Implement CIMA qualification pathway system with standard training routes and expedited assessment routes for Associate (ACIMArb), Member (MCIMArb), and Fellow (FCIMArb) levels.

## System Architecture

### Qualification Levels
- **Part I → Associate (ACIMArb)**: Foundation level
- **Part II → Member (MCIMArb)**: Intermediate level
- **Part III → Fellow (FCIMArb)**: Advanced level

### Pathways
1. **Standard Pathway**: Complete courses sequentially (Part I → Part II → Part III)
2. **Expedited Pathway**: Skip courses via assessment + admin review
   - Expedited Member: 14-day assessment
   - Expedited Fellow: 48-hour assessment

## Database Schema Changes

### 1. Users Table Updates
Add fields to track qualification status:
```sql
ALTER TABLE users ADD COLUMN current_level TEXT DEFAULT 'NONE';
ALTER TABLE users ADD COLUMN pathway_type TEXT; -- 'STANDARD', 'EXPEDITED', 'HYBRID'
ALTER TABLE users ADD COLUMN eligibility_flags JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN years_adr_experience INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN years_legal_experience INTEGER DEFAULT 0;
```

### 2. New Tables

#### expedited_applications
```sql
CREATE TABLE expedited_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  target_level TEXT NOT NULL, -- 'MEMBER', 'FELLOW'
  status TEXT DEFAULT 'pending', -- 'pending', 'under_review', 'approved', 'rejected'
  cv_url TEXT,
  experience_summary TEXT,
  qualifications_summary TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id),
  review_comments TEXT,
  assessment_score NUMERIC,
  assessment_passed BOOLEAN,
  assessment_completed_at TIMESTAMP
);
```

#### application_documents
```sql
CREATE TABLE application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES expedited_applications(id),
  document_type TEXT NOT NULL, -- 'certificate', 'degree', 'transcript', 'other'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

#### qualification_assessments
```sql
CREATE TABLE qualification_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES expedited_applications(id),
  assessment_type TEXT NOT NULL, -- 'member_14day', 'fellow_48hour'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  score NUMERIC,
  passed BOOLEAN,
  submission_content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### User-Facing Endpoints

#### Qualification Status
- `GET /api/qualification/status` - Get user's current qualification level and eligibility
- `GET /api/qualification/pathway` - Get available pathways based on current status

#### Expedited Applications
- `POST /api/expedited/apply` - Submit expedited application
- `GET /api/expedited/applications` - Get user's applications
- `GET /api/expedited/applications/:id` - Get specific application details
- `POST /api/explicated/applications/:id/documents` - Upload supporting documents
- `POST /api/expedited/applications/:id/assessment` - Submit assessment

### Admin Endpoints

#### Application Management
- `GET /api/admin/expedited/applications` - List all pending applications
- `GET /api/admin/expedited/applications/:id` - Get application with full details
- `POST /api/admin/explicated/applications/:id/approve` - Approve application
- `POST /api/admin/explicated/applications/:id/reject` - Reject application
- `POST /api/admin/explicated/applications/:id/review` - Add review comments

## UI Components

### User-Facing Pages

#### 1. Qualification Dashboard
- Display current level (Associate/Member/Fellow/None)
- Show pathway progress visualization
- Display eligibility for next levels
- Show expedited route options if eligible

#### 2. Expedited Application Form
- Target level selection (Member/Fellow)
- CV upload (PDF)
- Experience summary (years ADR, years legal)
- Qualifications summary
- Certificate/degree document uploads
- Terms acknowledgment

#### 3. Assessment Submission
- Assessment instructions display
- Text editor for written assessment
- Submit button with deadline countdown

#### 4. Application Status Tracker
- Show application status (pending, under review, approved, rejected)
- Display review comments if any
- Show next steps

### Admin Pages

#### 1. Applications Dashboard
- List of pending applications
- Filter by status, level, date
- Quick stats (pending count, approved today, etc.)

#### 2. Application Review Modal
- View applicant details
- Download CV and documents
- Review experience and qualifications
- Approve/Reject buttons with comments
- Link to upgrade user level on approval

## Business Logic

### Eligibility Rules

#### Standard Pathway
```typescript
// Part I (Associate)
- Open to all professionals
- No prior experience required

// Part II (Member)
- Must have completed Part I (Associate)
- Or have equivalent qualification

// Part III (Fellow)
- Must have completed Part II (Member)
- 7+ years ADR experience OR 10+ years legal experience
- CV submission required
- Admin approval required
```

#### Expedited Pathway
```typescript
// Expedited Member
- LL.M holders OR ACIMArb members OR experienced legal professionals
- Demonstrated knowledge of arbitration law
- 14-day assessment (pass ≥50%)
- Admin review

// Expedited Fellow
- Must be MCIMArb or equivalent
- 7+ years ADR OR 10+ years legal experience
- Proven award-writing skills
- 48-hour assessment
- Admin review
```

### Level Upgrade Logic
```typescript
async function upgradeUserLevel(userId: string, newLevel: string, pathway: string) {
  // Update user current_level
  // Issue certificate
  // Send notification
  // Update eligibility flags
  // Log progression
}
```

### Enrollment Blocking
```typescript
function canEnrollInCourse(user: User, course: Course): boolean {
  const courseLevel = course.level; // 'associate', 'member', 'fellow'
  const userLevel = user.current_level;
  
  if (courseLevel === 'associate') return true;
  if (courseLevel === 'member' && userLevel === 'associate') return true;
  if (courseLevel === 'member' && userLevel === 'member') return true; // repeat
  if (courseLevel === 'fellow' && userLevel === 'member') return true;
  if (courseLevel === 'fellow' && userLevel === 'fellow') return true; // repeat
  
  return false;
}
```

## Implementation Phases

### Phase 1: Database & Schema (Priority: HIGH)
1. Create Supabase migration for new tables
2. Update users table with qualification fields
3. Update shared/schema.ts with new schemas
4. Implement RLS policies for new tables
5. Generate TypeScript types

### Phase 2: API Endpoints (Priority: HIGH)
1. Create qualification status endpoints
2. Create expedited application CRUD endpoints
3. Create document upload endpoints
4. Create assessment submission endpoints
5. Create admin review endpoints
6. Add eligibility validation middleware

### Phase 3: User UI (Priority: MEDIUM)
1. Create qualification dashboard component
2. Create expedited application form
3. Create document upload component
4. Create assessment submission interface
5. Create application status tracker
6. Integrate with existing course browser

### Phase 4: Admin UI (Priority: MEDIUM)
1. Create applications dashboard
2. Create application review modal
3. Add approve/reject functionality
4. Add document preview
5. Add user level upgrade on approval

### Phase 5: Integration (Priority: HIGH)
1. Update course enrollment logic
2. Add eligibility checks to enrollment flow
3. Update certificate issuance logic
4. Add notifications for status changes
5. Update user profile display

### Phase 6: Testing (Priority: MEDIUM)
1. Test standard pathway progression
2. Test expedited application flow
3. Test admin approval workflow
4. Test enrollment blocking logic
5. Test certificate issuance
6. End-to-end testing

## File Structure

### New Files
```
client/src/components/
  qualification-dashboard.tsx
  expedited-application-form.tsx
  document-upload.tsx
  assessment-submission.tsx
  application-status-tracker.tsx

client/src/pages/
  qualification-pathway.tsx
  expedited-application.tsx

client/src/components/admin/
  expedited-applications-dashboard.tsx
  application-review-modal.tsx

server/routes/
  qualification.ts
  expedited.ts

server/storage/
  expedited-applications.ts
  application-documents.ts
  qualification-assessments.ts
```

### Modified Files
```
shared/schema.ts - Add new schemas
shared/database.types.ts - Regenerate after migration
server/routes/courses.ts - Add eligibility checks
server/routes/admin.ts - Add expedited review endpoints
client/src/pages/course-browser.tsx - Show eligibility
client/src/components/admin-overview-stats.tsx - Add application stats
```

## Security Considerations

1. **Document Upload Validation**
   - File type restrictions (PDF, JPG, PNG)
   - File size limits (max 10MB)
   - Virus scanning integration

2. **Access Control**
   - Only admins can review applications
   - Users can only view their own applications
   - Assessment submissions time-locked

3. **Data Privacy**
   - CV and documents stored securely
   - Admin audit trail for reviews
   - GDPR compliance for personal data

## Success Metrics

1. Users can successfully apply for expedited routes
2. Admin can review and approve/reject applications
3. User levels automatically upgrade on approval
4. Enrollment correctly blocks ineligible users
5. Certificates issued correctly on completion
6. Dashboard accurately shows progression

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 4-5 hours
- Phase 4: 3-4 hours
- Phase 5: 2-3 hours
- Phase 6: 2-3 hours

**Total: 16-22 hours**
