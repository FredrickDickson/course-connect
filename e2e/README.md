# E2E Audit Suite

Comprehensive Playwright suite that walks the whole app and labels each flow as
**pass / partial / broken / not_built**. Output:

- `test-results/audit.jsonl` — raw, one JSON entry per flow.
- `docs/agent/app-audit-report.md` — human-readable summary (auto-generated).

## Coverage

| File | Area |
|---|---|
| `01-public.spec.ts` | Public routes + verify-member RPC |
| `02-auth.spec.ts` | Register validation, login, logout, role guards |
| `03-learner-journey.spec.ts` | Dashboard, course catalog → detail → enroll CTA |
| `04-learning-experience.spec.ts` | Tabs config (Activities hidden, Resources visible), sidebar checkboxes |
| `05-instructor.spec.ts` | Instructor dashboard, create-course, **resource upload UI** |
| `06-admin.spec.ts` | Admin dashboard, expedited applications |
| `07-community.spec.ts` | Forum, create post |
| `08-certificate.spec.ts` | Certification list, preview iframe |
| `09-edge-functions.spec.ts` | Smoke-pings `quiz-submit`, `renewal-reminders`, `send-email`, `paystack-course-initialize`, `admin-setup` |

## Setup

1. **Seed test accounts** (idempotent, only touches `*@cima-test.dev`):
   ```bash
   bun run scripts/seed-e2e-users.ts
   ```
   Requires `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in env.

2. **Run the suite**:
   ```bash
   bunx playwright test
   ```

3. Open `docs/agent/app-audit-report.md` for the verdict.

## What the suite intentionally does NOT do

- No real Paystack charge — Paystack init only checks the function returns an auth URL.
- No production-data writes — all mutations use seeded `*@cima-test.dev` accounts.
- No visual regression / Lighthouse — separate concern.

## Known findings the suite will surface (pre-run prediction)

- **NOT BUILT**: instructor "upload resource" UI — `client/src/pages/resources.tsx` is a static marketing page; no upload control wired to the `lesson-resources` storage bucket or `resources` table.
- **PARTIAL**: certificate preview only renders if seed user has a completed enrollment; configure seed course completion to verify end-to-end.
- **BROKEN risk**: `renewal-reminders` edge function depends on `RESEND_API_KEY` and a verified email domain — failure mode is captured in the report.