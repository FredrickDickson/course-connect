



# Unified Onboarding & Progression Model — Complete Architecture

## Overview

This is a **Digital Secretariat** model where user progression is determined by Admin review rather than automated scripts. The system treats eligibility as a high-end application process with structured data collection upfront.

---

## Database Architecture

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **`users`** | User account & assigned rank | `assigned_level`, `current_level`, `level_source` |
| **`professional_profiles`** | Onboarding questionnaire & review status | `review_status`, `assigned_level`, `submitted_payload` |
| **`professional_documents`** | Document vault (CV, certificates, etc.) | `document_type`, `file_url`, `status` |
| **`profiles`** | Basic user profile data | `profile_completed` (legacy) |

### Status Enum Values

```
professional_profiles.review_status:
  DRAFT → UNDER_REVIEW → APPROVED | REJECTED | MORE_INFO_REQUIRED

users.assigned_level:
  NONE → ASSOCIATE → MEMBER → FELLOW

users.level_source:
  DEFAULT | EXPEDITED | ADMIN | MIGRATION
```

---

## Onboarding Flow for New Users

### Step 1: Registration & Initial Redirect
```
User Registers → Login → useAuthGuard detects review_status !== 'APPROVED'
                                    ↓
                              Redirect to /onboarding
```

**Guard Logic** (`client/src/hooks/useAuthGuard.ts:37-56`):
- Checks `professional_profiles.review_status === 'APPROVED'`
- If not approved → force redirect to `/onboarding`
- Admins bypass this check

---

### Step 2: The Onboarding Questionnaire (The "Intake")

**File:** [client/src/pages/onboarding.tsx](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/client/src/pages/onboarding.tsx:0:0-0:0)

#### Step 2A: Personal Information
- Full name, Email
- Date of birth, Gender
- Nationality, Country, City
- Phone, WhatsApp, Address
- Profile photo

#### Step 2B: Professional Background
- Job title, Organization
- Professional background (Lawyer, Judge, Academic, ADR Practitioner, etc.)
- Highest qualification (LLB, LLM, PhD, etc.)
- Years of experience

#### Step 2C: ADR Experience Gate (`experienceChoice`)
**Critical branching point:**

| Choice | Path | Action |
|--------|------|--------|
| **"No"** (No ADR experience) | Standard Track | Auto-assign `ASSOCIATE`, skip detailed form |
| **"Yes"** (Has ADR experience) | Expedited Track | Show detailed professional profile form |

---

### Step 3: Document Vault (For Expedited Track)

**API:** `POST /api/qualification/professional-profile/documents`

Users upload:
- **CV** — Professional history
- **CERTIFICATE** — Degree/LLM certificates
- **LICENSE** — Practicing certificates/ID
- **PORTFOLIO** — Case work samples
- **REFERENCE** — Professional references
- **AWARD** — ADR-related awards

Stored in `professional_documents` table with `status: 'PENDING'`

---

### Step 4: Profile Submission & Review

**API:** `POST /api/qualification/professional-profile`

```json
{
  "submit": true,  // Triggers status change to UNDER_REVIEW
  "track": "ARBITRATION",
  "yearsAdrExperience": 5,
  "yearsLegalExperience": 10,
  "practiceAreas": ["Construction", "Energy"],
  "adrRoles": ["Arbitrator", "Counsel"],
  "qualifications": [...],
  "narrativeSummary": "I have served as sole arbitrator...",
  "selfAssessedLevel": "MEMBER"
}
```

**Status Changes:**
```
DRAFT → UNDER_REVIEW (when user submits)
UNDER_REVIEW → APPROVED | REJECTED | MORE_INFO_REQUIRED (admin decision)
```

---

## Admin Review & Level Assignment

### Admin Interface
**File:** [client/src/pages/admin-expedited-reviews.tsx](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/client/src/pages/admin-expedited-reviews.tsx:0:0-0:0)

Admin sees:
- List of pending profiles (`review_status: 'UNDER_REVIEW'`)
- Professional summary (experience, qualifications, practice areas)
- Uploaded documents
- Self-assessed level

### Admin Actions

| Action | `review_status` | `assigned_level` | Effect |
|--------|----------------|------------------|--------|
| **Request Info** | `MORE_INFO_REQUIRED` | — | User must resubmit |
| **Reject** | `REJECTED` | `NONE` | User stays at default level |
| **Assign Associate** | `APPROVED` | `ASSOCIATE` | Standard entry level |
| **Assign Member** | `APPROVED` | `MEMBER` | Expedited progression |
| **Assign Fellow** | `APPROVED` | `FELLOW` | Maximum level |

**API:** `POST /api/qualification/professional-profiles/:id/decision`

---

## Enrollment & Progression Guard

### Course Enrollment Check
**File:** `server/routes/enrollments.ts:123-149`

```typescript
resolveEnrollmentLevel(userId, requestedLevel, courseLevel):
  1. Fetch professional profile
  2. If review_status !== 'APPROVED' → return 'ASSOCIATE'
  3. Else return profile.assigned_level
```

### Client-Side Pre-Check
**File:** `client/src/components/enrollment-form.tsx:425-436`

```typescript
if (user.assignedLevel === "ASSOCIATE" && course.level === "FELLOW") {
  block with message: "This course requires Fellowship status..."
}
```

---

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│  NEW USER REGISTERS                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Auth Guard Check                                   │
│  - Query professional_profiles.review_status              │
│  - Status is NULL/DRAFT/UNDER_REVIEW/REJECTED/MORE_INFO     │
│  → Redirect to /onboarding                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Onboarding Questionnaire                           │
│  ├─ Personal Info (name, contact, address)                  │
│  ├─ Professional Background (job, org, qualifications)       │
│  └─ ADR Experience Gate:                                     │
│      ├─ "No experience" → Auto-assign ASSOCIATE            │
│      └─ "Has experience" → Continue to detailed form        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Document Vault (Expedited Users)                   │
│  ├─ Upload CV                                               │
│  ├─ Upload Degree/LLM Certificate                           │
│  ├─ Upload Practicing Certificate/ID                        │
│  └─ Upload additional supporting docs                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Submit for Review                                  │
│  - POST professional-profile {submit: true}                 │
│  - Status: DRAFT → UNDER_REVIEW                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   ADMIN QUEUE   │
                    │  (48hr review)  │
                    └────────┬────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   ┌─────────┐         ┌─────────┐          ┌─────────┐
   │APPROVED │         │REJECTED │          │MORE INFO│
   │(upgrade)│         │(default)│          │(resubmit)
   └────┬────┘         └────┬────┘          └────┬────┘
        ↓                    ↓                    ↓
   Assigned Level      Stay at            Return to
   (MEMBER/FELLOW)     ASSOCIATE           onboarding
        ↓                    ↓                    ↓
        └────────────────────┴────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Course Enrollment                                  │
│  ├─ useAuthGuard sees APPROVED → allows access              │
│  ├─ User browses courses                                    │
│  ├─ enrollment-form checks assignedLevel vs course.level     │
│  └─ resolveEnrollmentLevel returns admin-assigned level      │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Architectural Principles

| Principle | Implementation |
|-----------|----------------|
| **Admin-Led Progression** | No automated eligibility logic; Admin assigns levels via review UI |
| **Document Evidence** | Users must upload CV, certificates, licenses for expedited track |
| **Gate Before Content** | [useAuthGuard](cci:1://file:///c:/Users/Administrator/Documents/projects/course-connect/client/src/hooks/useAuthGuard.ts:5:0-65:1) blocks all protected routes until `review_status === 'APPROVED'` |
| **Simplified Enrollment** | Client-side rank check prevents Associate→Fellow enrollment attempts |
| **Audit Trail** | All admin decisions stored with `reviewer_id`, `decision_at`, `assigned_level_notes` |

---

## Files & Components Reference

| Component | File | Purpose |
|-----------|------|---------|
| **Onboarding Guard** | [client/src/hooks/useAuthGuard.ts](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/client/src/hooks/useAuthGuard.ts:0:0-0:0) | Redirects unverified users to /onboarding |
| **Onboarding Form** | [client/src/pages/onboarding.tsx](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/client/src/pages/onboarding.tsx:0:0-0:0) | Multi-step questionnaire & document upload |
| **Admin Review UI** | [client/src/pages/admin-expedited-reviews.tsx](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/client/src/pages/admin-expedited-reviews.tsx:0:0-0:0) | Admin assigns levels & reviews documents |
| **Enrollment Guard** | `client/src/components/enrollment-form.tsx:425-436` | Client-side rank validation |
| **Backend Resolver** | `server/routes/enrollments.ts:123-149` | Uses `assigned_level` from approved profile |
| **Profile Storage** | [server/storage/professionalProfiles.ts](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/server/storage/professionalProfiles.ts:0:0-0:0) | CRUD for professional profiles & documents |
| **Qualification API** | [server/routes/qualification.ts](cci:7://file:///c:/Users/Administrator/Documents/projects/course-connect/server/routes/qualification.ts:0:0-0:0) | Endpoints for profile & document management |



P0	Migrate course_enrollments to enrollments	Data integrity
P0	Remove inline Paystack popup	Security
P1	Add course card lock/unlock states	UX
P1	Create enrollment gate modal	Conversion
P2	Progression ladder on dashboard	Engagement
P2	Course type (online/physical)	Completeness
P3



Final UX Flow
Scenario	Flow
New User	Register → /onboarding → Submit profile → Can access platform → Enroll in Associate course → Complete → Earn ASSOCIATE level
Experienced User	Register → /onboarding → Select "I have experience" → Fill detailed form + Upload docs → Submit → /onboarding shows "Under Review" → Admin assigns level → Access platform at assigned level
Admin	Register → Auto-redirect to /admin