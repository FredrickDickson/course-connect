# Supabase Security Audit Report

**Project:** cima_connect  
**Project ID:** emvibxbcrvritkwkguya  
**Region:** eu-central-1  
**Audit Date:** May 6, 2026  
**Overall Risk Score:** **HIGH (7/10)**

---

## Executive Summary

This comprehensive security audit identified **3 CRITICAL**, **3 HIGH**, **6 MEDIUM**, and **1 LOW** severity issues across database security, authentication, API key management, storage, and edge functions. The most critical vulnerabilities involve Row Level Security (RLS) misconfiguration and hardcoded credentials in client-side code.

**Immediate Action Required:** Address all CRITICAL issues within 7 days.

---

## Critical Issues

### 1. RLS Disabled on public.sessions Table

**Severity:** CRITICAL  
**Location:** `public.sessions` table  
**Risk:** Row Level Security is disabled on the sessions table despite having RLS policies defined. Anyone with the anon key can read, modify, or delete all session data, potentially allowing session hijacking, privilege escalation, or complete data exposure.

**Details:**
- Table has policy `sessions_view_own` but RLS is not enabled
- 18 rows currently in the table
- Advisor alert: "Row Level Security is disabled"

**Remediation:**
```sql
-- Enable RLS on the sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Verify policies are working correctly
SELECT * FROM pg_policies WHERE tablename = 'sessions';
```

**Additional Steps:**
1. Review the existing policy to ensure it properly restricts access
2. Test with anon role to verify access is restricted
3. Monitor for any application errors after enabling RLS

---

### 2. Hardcoded Anon Key in Client-Side Code

**Severity:** CRITICAL  
**Location:** `client/src/integrations/supabase/client.ts` (line 6)  
**Risk:** The Supabase anon/public key is hardcoded in the client-side TypeScript file. This key is exposed to all users who access the application and can be extracted from the browser bundle or network requests.

**Details:**
```typescript
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdmlieGJjcnZyaXRrd2tndXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzMzMDQsImV4cCI6MjA5MDcwOTMwNH0.uU5RMhLpiIjqDJykjbRHgKBAGtTU2Pk2ZTPa5tSHTT4";
```

**Remediation:**
```typescript
// client/src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

**Additional Steps:**
1. Add the environment variables to `.env.local`, `.env.production.example`, and deployment configs
2. Regenerate the anon key if it has been exposed (use Supabase dashboard)
3. Ensure the new key is not committed to version control
4. Update `.gitignore` to exclude `.env*` files

---

### 3. Hardcoded Setup Key in Edge Function

**Severity:** CRITICAL  
**Location:** `supabase/functions/admin-setup/index.ts` (line 20)  
**Risk:** The admin setup function contains a hardcoded setup key "CIMA_ADMIN_SETUP_2024" visible in the deployed code. This could allow unauthorized initial admin account creation if discovered.

**Details:**
```typescript
const SETUP_KEY = "CIMA_ADMIN_SETUP_2024";
```

**Remediation:**
```typescript
// supabase/functions/admin-setup/index.ts
const SETUP_KEY = Deno.env.get("ADMIN_SETUP_KEY") || throw new Error("ADMIN_SETUP_KEY not set");
```

**Additional Steps:**
1. Set the ADMIN_SETUP_KEY environment variable in Supabase dashboard
2. Rotate the setup key immediately
3. Add the key to environment variable documentation
4. Consider implementing IP whitelisting for the admin-setup endpoint

---

## High Severity Issues

### 4. SECURITY DEFINER Views

**Severity:** HIGH  
**Location:** `public.pathway_analytics`, `public.course_enrollments_legacy`, `public.course_catalog_view`  
**Risk:** Three views are defined with SECURITY DEFINER property, which causes them to execute with the view creator's permissions rather than the querying user's permissions. This can bypass Row Level Security policies.

**Details:**
- `public.pathway_analytics` - SECURITY DEFINER
- `public.course_enrollments_legacy` - SECURITY DEFINER  
- `public.course_catalog_view` - SECURITY DEFINER

**Remediation:**
```sql
-- Review each view and determine if SECURITY DEFINER is necessary
-- If not, remove it:

ALTER VIEW public.pathway_analytics SET (security_invoker = true);
ALTER VIEW public.course_enrollments_legacy SET (security_invoker = true);
ALTER VIEW public.course_catalog_view SET (security_invoker = true);
```

**Additional Steps:**
1. Review the business logic requiring SECURITY DEFINER
2. If elevated privileges are needed, implement proper access controls within the view
3. Test application functionality after changes

---

### 5. Public Can Execute SECURITY DEFINER Functions

**Severity:** HIGH  
**Location:** Multiple functions accessible via `/rest/v1/rpc/`  
**Risk:** Several SECURITY DEFINER functions can be executed by the anon role without authentication. These functions run with elevated privileges and could be abused for privilege escalation or data exfiltration.

**Affected Functions:**
- `public.is_admin(_user_id text)` - Check if user is admin
- `public.handle_new_user()` - Handle new user creation
- `public.handle_public_user_created()` - Handle public user creation
- `public.update_track_progress_on_enrollment_completion()` - Update track progress

**Remediation:**
```sql
-- Revoke EXECUTE from anon role for sensitive functions
REVOKE EXECUTE ON FUNCTION public.is_admin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_public_user_created() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_track_progress_on_enrollment_completion() FROM anon;

-- Or switch to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_admin(_user_id text)
SECURITY INVOKER
AS $$
  -- function body
$$ LANGUAGE sql;
```

**Additional Steps:**
1. Audit all SECURITY DEFINER functions in the database
2. Ensure only necessary functions are exposed to anon/authenticated roles
3. Implement additional authorization checks within functions

---

### 6. Edge Functions Without JWT Verification

**Severity:** HIGH  
**Location:** Edge Functions  
**Risk:** Two edge functions have JWT verification disabled, allowing unauthenticated access to sensitive operations.

**Affected Functions:**
- `admin-setup` (verify_jwt: false) - Can create admin accounts
- `send-email` (verify_jwt: false) - Can send arbitrary emails

**Remediation:**

For `admin-setup`:
```typescript
// Keep verify_jwt: false for initial setup only, but add IP whitelist or additional auth
// OR require a bearer token from environment variable
const authHeader = req.headers.get("Authorization");
if (authHeader !== `Bearer ${Deno.env.get("ADMIN_API_KEY")}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

For `send-email`:
```typescript
// Enable JWT verification
// In supabase/functions/send-email/index.ts, add:
// verify_jwt: true in the function configuration
```

**Additional Steps:**
1. Implement rate limiting on these endpoints
2. Add request logging for audit trails
3. Consider implementing API key authentication for send-email

---

## Medium Severity Issues

### 7. Function Search Path Mutable

**Severity:** MEDIUM  
**Location:** Multiple functions  
**Risk:** Many database functions have mutable search_path, which can lead to SQL injection attacks if user input influences function execution.

**Affected Functions:**
- `public.award_reputation_points`
- `public.award_post_points`
- `public.award_reply_points`
- `public.award_official_answer_points`
- `public.get_popular_tags`
- `public.update_follow_counts`
- `public.update_content_reports_updated_at`
- `public.handle_new_user`
- `public.handle_public_user_created`
- `public.update_track_progress_on_enrollment_completion`
- `public.auto_generate_certificate_verification_code`
- `public.generate_certificate_verification_code`

**Remediation:**
```sql
-- Set search_path to a fixed value for each function
CREATE OR REPLACE FUNCTION public.award_reputation_points(user_id uuid, points integer, achievement_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  -- function body
$$;
```

**Additional Steps:**
1. Audit all functions for search_path issues
2. Apply consistent search_path across all functions
3. Test application functionality after changes

---

### 8. Leaked Password Protection Disabled

**Severity:** MEDIUM  
**Location:** Auth configuration  
**Risk:** Leaked password protection is disabled in Supabase Auth, allowing users to register with compromised passwords from data breaches.

**Remediation:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Enable "Leaked password protection"
3. This will check passwords against HaveIBeenPwned.org

**Additional Steps:**
1. Communicate this change to users
2. Force password reset for existing users if needed
3. Monitor for registration issues after enabling

---

### 9. Multiple Permissive RLS Policies

**Severity:** MEDIUM  
**Location:** Multiple tables  
**Risk:** Several tables have multiple permissive policies for the same role and action, which impacts query performance as each policy must be evaluated.

**Affected Tables:**
- `public.track_progress` - Multiple policies for dashboard_user role (SELECT, UPDATE)
- `public.users` - Multiple policies for anon, authenticated, authenticator, dashboard_user roles

**Remediation:**
```sql
-- Combine multiple permissive policies into a single policy using OR logic
CREATE POLICY "users_combined_select" ON public.users
FOR SELECT
TO authenticated, anon
USING (
  (auth.uid() = id) OR 
  (role = 'instructor') OR
  (EXISTS (SELECT 1 FROM enrollments WHERE user_id = auth.uid()))
);
```

**Additional Steps:**
1. Review policy logic to ensure no access is lost
2. Test application functionality after consolidation
3. Monitor query performance improvements

---

### 10. Storage Policy Issues - Public Role Insert Permissions

**Severity:** MEDIUM  
**Location:** Storage policies  
**Risk:** Some storage policies allow the `public` role to insert files with only an `auth.uid() IS NOT NULL` check, which could allow unauthorized uploads if the auth context is somehow bypassed.

**Affected Policies:**
- `assignment_submissions_user_write` - Public role can insert with auth.uid() check
- `course_thumbnails_instructor_write` - Public role can insert with auth.uid() check
- `forum_attachments_user_write` - Public role can insert with auth.uid() check
- `instructor_cv_owner_access` - Public role can insert with auth.uid() check
- `instructor_videos_instructor_write` - Public role can insert with auth.uid() check
- `user_avatars_user_write` - Public role can insert with auth.uid() check

**Remediation:**
```sql
-- Change role from public to authenticated
DROP POLICY "assignment_submissions_user_write" ON storage.objects;
CREATE POLICY "assignment_submissions_user_write" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'assignment-submissions'::text) AND 
  (auth.uid() IS NOT NULL)
);
```

**Additional Steps:**
1. Audit all storage policies for public role usage
2. Restrict to authenticated role where appropriate
3. Test file upload functionality after changes

---

### 11. Authenticated Can Execute SECURITY DEFINER Functions

**Severity:** MEDIUM  
**Location:** Multiple RPC functions  
**Risk:** Several SECURITY DEFINER functions can be executed by any authenticated user, potentially allowing privilege escalation or data manipulation beyond intended scope.

**Affected Functions:**
- `public.award_reputation_points`
- `public.calculate_member_level`
- `public.get_popular_tags`
- `public.handle_new_user`
- `public.handle_public_user_created`
- `public.is_admin`
- `public.update_track_progress_on_enrollment_completion`

**Remediation:**
```sql
-- Revoke from authenticated and grant only to specific roles
REVOKE EXECUTE ON FUNCTION public.award_reputation_points(uuid, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.award_reputation_points(uuid, integer, text) TO service_role;

-- Or add role checks within the function
CREATE OR REPLACE FUNCTION public.award_reputation_points(user_id uuid, points integer, achievement_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- function body
END;
$$;
```

**Additional Steps:**
1. Review each function's intended audience
2. Implement proper authorization within functions
3. Create database roles for different privilege levels

---

### 12. Storage Bucket Public Access

**Severity:** MEDIUM  
**Location:** Storage buckets  
**Risk:** Several storage buckets are marked as public, meaning files are accessible via direct URL without authentication. This could lead to unauthorized access to sensitive documents.

**Public Buckets:**
- `course-thumbnails` - Public (appropriate for course catalog)
- `user-avatars` - Public (appropriate for user profiles)
- `certificates` - Public (appropriate for verification)
- `avatars` - Public (duplicate bucket, no MIME type restrictions)
- `forum-attachments` - Public (may contain sensitive user content)

**Remediation:**
```sql
-- Review forum-attachments public setting
UPDATE storage.buckets 
SET public = false 
WHERE id = 'forum-attachments';

-- Consider making avatars bucket private if user-avatars is the primary bucket
UPDATE storage.buckets 
SET public = false 
WHERE id = 'avatars';
```

**Additional Steps:**
1. Review if forum-attachments should be public
2. Implement signed URLs for temporary access if needed
3. Remove duplicate avatars bucket if not needed
4. Add MIME type restrictions to avatars bucket

---

## Low Severity Issues

### 13. Performance Issues - Unindexed Foreign Keys

**Severity:** LOW  
**Location:** Multiple tables  
**Risk:** Many foreign key constraints lack covering indexes, which can impact query performance as the database grows.

**Affected Tables:**
- `assignment_submissions.assignment_submissions_assignment_id_fkey`
- `assignments.assignments_lesson_id_fkey`
- `certifications.certifications_course_id_fkey`
- `community_notifications.community_notifications_user_id_fkey`
- And 30+ more...

**Remediation:**
```sql
-- Add indexes for frequently queried foreign keys
CREATE INDEX idx_assignment_submissions_assignment_id 
ON assignment_submissions(assignment_id);

CREATE INDEX idx_assignments_lesson_id 
ON assignments(lesson_id);

-- Repeat for all foreign keys used in JOINs or WHERE clauses
```

**Additional Steps:**
1. Analyze query patterns to identify most critical indexes
2. Add indexes incrementally to monitor performance impact
3. Use EXPLAIN ANALYZE to verify index usage

---

### 14. Duplicate Index

**Severity:** LOW  
**Location:** `public.members` table  
**Risk:** Duplicate indexes on the same column waste storage and can slow down write operations.

**Details:**
- `idx_members_status`
- `idx_members_status_lookup` (duplicate)

**Remediation:**
```sql
-- Drop one of the duplicate indexes
DROP INDEX idx_members_status_lookup;
```

---

## Positive Security Findings

✅ **Row Level Security Enabled:** Most tables have RLS enabled  
✅ **Service Role Key Isolation:** Service role key is only used in backend code (Edge Functions, server routes)  
✅ **Storage Bucket Restrictions:** File size limits and MIME type restrictions are configured  
✅ **Environment Variables:** Edge Functions use environment variables for sensitive data  
✅ **Webhook Signature Verification:** Paystack webhook implements proper signature verification  
✅ **Modern Publishable Keys:** Project has both legacy anon key and modern publishable key available  
✅ **Database Version:** Running PostgreSQL 17 (latest stable version)  

---

## Best Practices Checklist

### Database Security
- [ ] Enable RLS on `public.sessions` table
- [ ] Review and consolidate SECURITY DEFINER views
- [ ] Audit all SECURITY DEFINER functions for privilege escalation risks
- [ ] Set fixed search_path for all functions
- [ ] Add indexes for foreign keys used in queries
- [ ] Remove duplicate indexes

### Authentication & Authorization
- [ ] Enable leaked password protection in Auth settings
- [ ] Implement proper role-based access control for RPC functions
- [ ] Review JWT token expiry settings
- [ ] Enable MFA for admin accounts

### API & Key Management
- [ ] Move anon key from client code to environment variables
- [ ] Rotate anon key (currently exposed in client bundle)
- [ ] Move admin setup key to environment variable
- [ ] Add API key authentication for send-email function
- [ ] Implement rate limiting on public endpoints

### Storage Security
- [ ] Review public bucket settings for forum-attachments
- [ ] Remove duplicate avatars bucket
- [ ] Add MIME type restrictions to avatars bucket
- [ ] Change storage policies from public to authenticated role
- [ ] Implement signed URLs for sensitive files

### Edge Functions
- [ ] Enable JWT verification for send-email function
- [ ] Add IP whitelisting or additional auth for admin-setup
- [ ] Implement request logging for audit trails
- [ ] Add rate limiting to all public endpoints

### Code Security
- [ ] Add `.env*` to `.gitignore` if not already present
- [ ] Audit for other hardcoded credentials
- [ ] Implement secret scanning in CI/CD pipeline
- [ ] Add security headers to server responses

---

## Remediation Priority Timeline

### Immediate (Within 7 Days)
1. Enable RLS on public.sessions table
2. Move anon key to environment variables
3. Move admin setup key to environment variable
4. Revoke anon EXECUTE on sensitive SECURITY DEFINER functions

### Short Term (Within 30 Days)
5. Review and fix SECURITY DEFINER views
6. Enable leaked password protection
7. Fix storage policy public role issues
8. Enable JWT verification on send-email function

### Medium Term (Within 90 Days)
9. Fix function search_path issues
10. Consolidate multiple permissive RLS policies
11. Add indexes for foreign keys
12. Review and restrict public storage buckets

### Long Term (Ongoing)
13. Implement comprehensive audit logging
14. Set up security monitoring and alerts
15. Regular security audits (quarterly)
16. Security training for development team

---

## Additional Recommendations

### Monitoring & Alerting
- Set up alerts for failed authentication attempts
- Monitor for unusual API usage patterns
- Track RLS policy violations
- Monitor storage bucket access logs

### Incident Response
- Create incident response plan
- Document security team contacts
- Establish communication channels for security incidents
- Regularly test incident response procedures

### Compliance
- Review GDPR compliance for user data handling
- Ensure data retention policies are documented
- Implement data deletion workflows
- Regular security compliance audits

---

## Conclusion

The Supabase setup for cima_connect has a solid foundation with most security controls in place, but critical vulnerabilities exist that require immediate attention. The hardcoded credentials and RLS misconfiguration pose the highest risk and should be addressed immediately.

**Overall Assessment:** The system is functional but requires security hardening before it can be considered production-ready for sensitive educational and professional certification data.

**Next Steps:** Begin remediation starting with Critical issues, following the priority timeline outlined above.

---

**Audit Performed By:** Cascade Security Auditor  
**Audit Methodology:** Automated Supabase advisor checks, manual code review, database policy analysis, storage configuration audit, and edge function security review.  
**Tools Used:** Supabase MCP Server, Grep code analysis, manual security review
