# Codebase Review Report - CIMA Learn Platform

**Date:** May 8, 2026  
**Reviewer:** Cascade AI  
**Project:** FredrickDickson/course-connect

---

## Executive Summary

This comprehensive codebase review identified **3 CRITICAL**, **8 MODERATE**, and **6 MINOR** issues across security, architecture, performance, UX/accessibility, integrations, routing, and database schema. The most critical issues involve XSS vulnerabilities and exposed SECURITY DEFINER functions that require immediate attention.

---

## 1. Security Audit

### CRITICAL Issues

#### 1.1 XSS Vulnerability in LecturePreview.tsx
**File:** `client/src/components/LecturePreview.tsx`  
**Lines:** 147, 271  
**Severity:** CRITICAL

**Issue:** User-generated content is rendered using `dangerouslySetInnerHTML` without sanitization, allowing potential XSS attacks.

```tsx
// Line 147
<div
  className="prose max-w-none"
  dangerouslySetInnerHTML={{ __html: lessonData.content }}
/>

// Line 271
<div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: assignmentData.instructions }} />
```

**Recommendation:** Use DOMPurify (already installed) to sanitize all user-generated HTML content before rendering.

---

#### 1.2 SECURITY DEFINER Functions Exposed to Public
**Severity:** CRITICAL  
**Count:** 15+ functions

**Issue:** Multiple SECURITY DEFINER functions are callable by the `anon` role without authentication, which could allow unauthorized data access or manipulation.

**Affected Functions:**
- `public.create_lesson`
- `public.is_admin`
- `public.user_can_view_lesson`
- `public.user_can_view_question`
- `public.user_can_view_quiz`
- `public.user_owns_lesson`
- `public.user_owns_module`
- `public.user_owns_question`
- `public.user_owns_quiz`
- `public.verify_member`
- And 5+ additional functions

**Recommendation:** Revoke `EXECUTE` permission for `anon` role on these functions, or switch them to `SECURITY INVOKER` if appropriate. Move sensitive functions out of the public schema.

---

#### 1.3 SECURITY DEFINER Functions Exposed to Authenticated Users
**Severity:** CRITICAL  
**Count:** 10+ functions

**Issue:** Multiple SECURITY DEFINER functions are callable by the `authenticated` role, which could allow privilege escalation if not properly validated.

**Recommendation:** Review each function to ensure proper authorization checks exist within the function logic. Consider using `SECURITY INVOKER` where appropriate.

---

### MODERATE Issues

#### 1.4 Public Bucket Allows Listing
**File:** Supabase Storage  
**Bucket:** `course-thumbnails`  
**Severity:** MODERATE

**Issue:** Public bucket `course-thumbnails` has a broad SELECT policy on `storage.objects`, allowing clients to list all files in the bucket.

**Recommendation:** Remove the broad SELECT policy. Object URLs can be accessed without listing, so this policy is unnecessary and may expose more data than intended.

---

#### 1.5 Leaked Password Protection Disabled
**Severity:** MODERATE

**Issue:** Supabase Auth leaked password protection is currently disabled, which allows users to use compromised passwords.

**Recommendation:** Enable leaked password protection in Supabase Auth settings to enhance security.

---

### MINOR Issues

#### 1.6 TypeScript Ignore Usage
**Files:** 
- `client/src/components/admin-enrollments-table.tsx`
- `client/src/components/admin-courses-table.tsx`  
**Severity:** MINOR

**Issue:** `@ts-ignore` directives are used to suppress TypeScript errors, which may hide type-related bugs.

**Recommendation:** Replace `@ts-ignore` with proper type definitions or `@ts-expect-error` with explanatory comments.

---

### GOOD Security Practices

- ✅ No exposed secrets found in client-side code (secrets only in server-side files)
- ✅ All target="_blank" external links have `rel="noopener noreferrer"` attributes
- ✅ All database tables have RLS (Row Level Security) enabled
- ✅ Supabase client is properly implemented as a singleton

---

## 2. Architecture & Code Quality

### CRITICAL Issues

#### 2.1 React Key Anti-Pattern (key={index})
**Files:** 19 files affected  
**Severity:** CRITICAL

**Issue:** Using `key={index}` in React lists can cause rendering issues and bugs when items are reordered, inserted, or deleted.

**Affected Files:**
- `client/src/pages/resources.tsx` (lines 135, 172)
- `client/src/pages/professional-standards.tsx` (lines 177, 198, 361)
- `client/src/pages/global-ma-program.tsx` (lines 181, 226)
- `client/src/pages/expedited-application.tsx` (line 880)
- `client/src/pages/course-detail.tsx` (line 472)
- `client/src/pages/community-post.tsx` (line 948)
- `client/src/pages/community-forum.tsx` (line 212)
- `client/src/pages/certification.tsx` (lines 108, 183)
- `client/src/components/tag-input.tsx` (line 70)
- `client/src/components/welcome-tour.tsx` (line 102)
- `client/src/components/ScrollReveal.tsx` (line 90)
- `client/src/components/ui/field.tsx` (line 215)
- `client/src/components/PublishCourseDialog.tsx` (line 226)
- `client/src/components/NewPostModal.tsx` (line 564)
- `client/src/components/file-upload.tsx` (line 155)
- `client/src/components/breadcrumb-nav.tsx` (line 22)

**Recommendation:** Use unique, stable identifiers (e.g., `item.id`) as keys instead of array indices.

---

### MODERATE Issues

#### 2.2 Supabase Error Handling Anti-Pattern
**Files:** 12 files affected  
**Severity:** MODERATE

**Issue:** Many instances of `const { data } = await supabase` without proper error handling, which can lead to unhandled errors and poor user experience.

**Affected Files:**
- `client/src/pages/expedited-application.tsx`
- `client/src/pages/enrollment-status.tsx`
- `client/src/pages/community-post.tsx`
- `client/src/pages/community-create-post.tsx`
- `client/src/pages/checkout.tsx`
- `client/src/lib/qualification-api.ts`
- `client/src/hooks/use-qualification-state.ts`
- `client/src/components/follow-button.tsx`
- `client/src/components/recommended-section.tsx`
- `client/src/components/PublishCourseDialog.tsx`
- `client/src/components/NewPostModal.tsx`
- `client/src/components/bookmark-button.tsx`

**Recommendation:** Always handle errors from Supabase queries with try-catch or check the `error` property before using `data`.

---

### MINOR Issues

#### 2.3 useEffect with Empty Dependency Array
**File:** `client/src/components/ui/video-player.tsx`  
**Severity:** MINOR

**Issue:** useEffect with empty dependency array may cause stale closures or missed updates.

**Recommendation:** Review the dependency array and ensure all referenced values are included.

---

### GOOD Architecture Practices

- ✅ Supabase client is a singleton (createClient only used in client.ts)
- ✅ No N+1 query patterns detected
- ✅ Consistent use of React Query for server state management
- ✅ Proper component separation and organization
- ✅ No lodash dependency (good for bundle size)

---

## 3. Performance

### MODERATE Issues

#### 3.1 Limited Code Splitting
**Severity:** MODERATE

**Issue:** Only 5 components are lazy-loaded (InstructorDashboard, AdminDashboard, AdminSetup, BecomeInstructor, CreateCourse, CourseCurriculum) while many other heavy components are loaded upfront.

**Recommendation:** Implement React.lazy for more route-level components, especially large pages like course-detail, community-post, and onboarding.

---

### GOOD Performance Practices

- ✅ No heavy libraries like lodash detected
- ✅ Lazy loading implemented for admin/instructor routes
- ✅ Suspense boundaries with loading states for lazy-loaded components

---

## 4. UX & Accessibility

### MODERATE Issues

#### 4.1 Limited ARIA Labels
**Files:** Only 5 files with aria-label attributes  
**Severity:** MODERATE

**Issue:** Limited use of `aria-label` attributes on interactive elements, which affects screen reader accessibility.

**Affected Files:**
- `client/src/pages/reset-password.tsx`
- `client/src/pages/register.tsx`
- `client/src/pages/onboarding.tsx`
- `client/src/pages/login.tsx`
- `client/src/pages/community-forum-category.tsx`

**Recommendation:** Add `aria-label` attributes to all buttons, inputs, and interactive elements without visible text labels.

---

#### 4.2 Limited Alt Text for Images
**Files:** 24 files with alt attributes  
**Severity:** MODERATE

**Issue:** While alt attributes are used in 24 files, many images throughout the application may be missing alt text, affecting accessibility.

**Recommendation:** Audit all image elements and ensure descriptive alt text is provided for all images, especially decorative images should have `alt=""`.

---

### MINOR Issues

None identified.

---

## 5. Integrations

### Paystack Integration

**Files:** 5 files
- `client/src/pages/renew-membership.tsx`
- `client/src/pages/checkout.tsx`
- `client/src/components/admin-enrollments-table.tsx`
- `client/src/components/enrollment-form.tsx`
- `client/src/components/admin-enrollments-unified.tsx`

**Observations:**
- PaystackPop is declared on window object (line 44 in checkout.tsx)
- No exposed Paystack keys found in client code (good)
- Integration appears to use external script loading pattern

**Recommendation:** Ensure Paystack script is loaded securely and verify webhook signature validation on the server side.

---

### Video Embed Integration

**Files:** 3 files
- `client/src/components/ui/video-player.tsx` (YouTube iframe API)
- `client/src/components/VideoUrlInput.tsx` (URL parsing)
- `client/src/components/VideoPlayer.tsx` (embed URL generation)

**Observations:**
- YouTube embeds use `rel=0&modestbranding=1` parameters (good)
- Vimeo embeds use standard player URL
- No iframe security attributes (sandbox) detected

**Recommendation:** Consider adding `sandbox` attributes to iframes for additional security.

---

### Supabase Integration

**Observations:**
- ✅ Singleton pattern for Supabase client
- ✅ Proper TypeScript types generated
- ✅ All tables have RLS enabled
- ⚠️ SECURITY DEFINER functions exposed (see Security section)

---

## 6. Routing & Navigation

### GOOD Practices

- ✅ Proper use of ProtectedRoute component for authenticated routes
- ✅ Role-based route protection (admin, instructor)
- ✅ Lazy loading for admin/instructor routes
- ✅ Suspense boundaries with loading states
- ✅ 404 page implemented (NotFound component)
- ✅ Conditional home route based on auth status

### MINOR Issues

None identified.

---

## 7. Database & Schema

### GOOD Practices

- ✅ All 42 tables have RLS (Row Level Security) enabled
- ✅ Foreign key constraints likely present (based on schema)
- ✅ Migration system in place (Supabase migrations)

### MODERATE Issues

#### 7.1 SECURITY DEFINER Functions (See Security Section)
**Severity:** Already documented in Security Audit (Section 1.2, 1.3)

---

## Summary of Findings

### Critical Issues (3)
1. XSS vulnerability in LecturePreview.tsx (lines 147, 271)
2. 15+ SECURITY DEFINER functions exposed to anon role
3. 10+ SECURITY DEFINER functions exposed to authenticated role

### Moderate Issues (8)
1. Public bucket allows listing (course-thumbnails)
2. Leaked password protection disabled
3. React key anti-pattern (key={index}) in 19 files
4. Supabase error handling anti-pattern in 12 files
5. Limited code splitting (only 5 lazy-loaded components)
6. Limited ARIA labels (only 5 files)
7. Limited alt text for images
8. useEffect with empty dependency array

### Minor Issues (6)
1. @ts-ignore usage in 2 files
2. useEffect with empty dependency array (video-player.tsx)

---

## Priority Recommendations

### Immediate (Critical)
1. **Fix XSS vulnerability** in LecturePreview.tsx by sanitizing HTML with DOMPurify
2. **Revoke anon EXECUTE permissions** on SECURITY DEFINER functions
3. **Review and secure** SECURITY DEFINER functions callable by authenticated users

### Short Term (Moderate)
1. Replace all `key={index}` with stable unique identifiers
2. Add proper error handling to all Supabase queries
3. Enable leaked password protection in Supabase Auth
4. Remove broad SELECT policy from course-thumbnails bucket
5. Implement code splitting for more route components
6. Add ARIA labels to interactive elements
7. Audit and add alt text to all images

### Long Term (Minor)
1. Remove @ts-ignore directives and fix type errors
2. Review useEffect dependency arrays
3. Add iframe sandbox attributes to video embeds

---

## Conclusion

The CIMA Learn platform demonstrates good security practices in many areas (no exposed secrets, RLS on all tables, proper external link security). However, critical XSS vulnerabilities and exposed SECURITY DEFINER functions require immediate attention. The codebase would benefit from improved error handling, accessibility enhancements, and better performance optimization through code splitting.

Overall, the platform is well-structured with proper separation of concerns, but addressing the critical security issues should be the top priority before any production deployment.
