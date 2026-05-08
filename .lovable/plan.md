## Goal

Two deliverables:

1. **Comprehensive Playwright test suite** that walks the whole app end-to-end and labels each flow as **PASS / PARTIAL / BROKEN / NOT BUILT**.
2. **Written audit report** (`docs/agent/app-audit-report.md`) summarising findings, generated from the test run.

The existing `e2e/auth.spec.ts`, `admin.spec.ts`, `checkout.spec.ts` are stub-quality (hardcoded fake users, no real selectors). I'll replace them with real, runnable tests using seeded test accounts.

## Test accounts (must be seeded once, then reused)

I'll add `e2e/fixtures/users.ts` referencing 4 accounts:
- `student@cima-test.dev` — plain learner, enrolled in 1 course
- `instructor@cima-test.dev` — approved instructor with 1 published course
- `admin@cima-test.dev` — admin
- `applicant@cima-test.dev` — instructor applicant pending review

A seed script `scripts/seed-e2e-users.ts` (Supabase service-role, one-shot) creates them via `auth.admin.createUser` + `user_roles` rows + a sample course/lesson/quiz/assignment/resource. Documented in the report; not run automatically.

## Test files

```
e2e/
  fixtures/users.ts                  shared credentials + login helper
  fixtures/seed-data.ts              expected course/lesson IDs from seed
  01-public.spec.ts                  landing, /courses, /verify-member, /resources, footer links — works without auth
  02-auth.spec.ts                    register, login, logout, forgot-password, role redirects
  03-onboarding.spec.ts              email verification screen + 2-step biodata
  04-learner-journey.spec.ts         browse → enroll (free track) → dashboard shows course
  05-learning-experience.spec.ts     open lesson, watch video ≥90% → checkbox auto-ticks; sidebar progress %; Activities tab hidden; Resources tab visible
  06-quiz-assignment.spec.ts         take quiz → pass → lesson ticks; submit assignment → lesson ticks; failed quiz does NOT tick
  07-certificate.spec.ts             complete all lessons in seeded course → certificate appears on /certification → preview dialog renders PDF iframe
  08-instructor.spec.ts              instructor login → /instructor → create course → add lesson → upload resource (file dropzone) → publish
  09-admin.spec.ts                   admin login → approve pending instructor application → change user role → analytics charts render
  10-community.spec.ts               create post in seeded board → reply → notifications badge increments
  11-renewal-emails.spec.ts          calls supabase.functions.invoke('renewal-reminders') with test flag, asserts 200 + email_send_log row written
  12-edge-functions.spec.ts          smoke-pings each edge fn (paystack-course-initialize, quiz-submit, send-email, renewal-reminders, admin-setup) with minimal valid payload, records status

Each test wraps its body in try/catch and writes a JSON line to `test-results/audit.jsonl`:
{ flow, status: 'pass'|'partial'|'broken'|'not_built', notes, screenshot? }
```

A `globalTeardown` aggregates `audit.jsonl` into `docs/agent/app-audit-report.md` with a summary table + per-flow detail + screenshots of failures.

## Edge function checks (no UI)

`12-edge-functions.spec.ts` uses the Supabase JS client directly:
- `quiz-submit` — submit known answers, expect `{ passed, score }`
- `renewal-reminders` — invoke with `{ dryRun: true }`, expect counts returned
- `send-email` — invoke with `{ to: testInbox, template: 'test' }`, expect 200
- `paystack-course-initialize` — invoke with seeded course, expect `authorization_url`
- Logs each as pass/broken with the response body snippet.

## Known areas the suite will surface

Based on a scan I already did, these are the most likely findings the report will flag:

- **NOT BUILT**: instructor "upload resource" UI (`client/src/pages/resources.tsx` is a static marketing page; no upload dropzone exists; `resources` table + storage bucket need wiring) — already discussed in the previous turn.
- **PARTIAL**: certificate generation works in `lib/certificate-generator.ts` but issuance trigger on course completion needs verification.
- **PARTIAL**: progress checkboxes for quiz/assignment lessons — the auto-tick wiring landed in a recent change; the test verifies it end-to-end.
- **BROKEN risk**: renewal reminder edge function — needs Resend secret + email domain verified; test will report exact failure mode.

## Out of scope

- No production data writes — every test uses seeded `*@cima-test.dev` accounts and a dedicated seed course.
- No payment actually charged — Paystack init only returns the auth URL, test stops there.
- Visual regression / Lighthouse — separate concern.

## Deliverable

After the run:
- `test-results/audit.jsonl` — raw results
- `docs/agent/app-audit-report.md` — human-readable report with summary table (PASS/PARTIAL/BROKEN/NOT BUILT counts), per-flow notes, screenshots of failures, and a prioritised fix list.

## Confirm before I build

1. OK to add the seed script + seed accounts to your Supabase project? (It's idempotent and only touches `*@cima-test.dev` rows.)
2. Should the audit run be triggered now (I'll execute Playwright after writing the suite), or do you want the suite written first and you run it?
