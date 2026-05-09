# Plan

## 1. Apply SF Pro Display / SF Pro Text across the entire app

Today, SF Pro fonts are loaded via `@font-face` and applied only to `<body>` (`font-sf-pro-text`) and `h1–h4`. Many shadcn/ui components and pages use Tailwind's `font-sans` / `font-serif` / `font-display` utilities, which currently resolve to `var(--font-sans)` / `var(--font-serif)` (undefined → falls back to system fonts) and `'Playfair Display'`. That's why text outside headings/body still looks like a non-Apple font.

Changes:
- In `client/src/index.css`, define CSS variables on `:root`:
  - `--font-sans: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;`
  - `--font-serif: 'SF Pro Display', -apple-system, serif;`
  - `--font-mono` left as-is (mono blocks unaffected).
- In `client/tailwind.config.ts` and `tailwind.config.ts` (root), repoint:
  - `display`, `headline`, `sf-pro-display` → `'SF Pro Display'` chain
  - `body`, `label`, `sf-pro-text` → `'SF Pro Text'` chain
  - `sans` already reads `var(--font-sans)` (now SF Pro Text), `serif` reads `var(--font-serif)` (now SF Pro Display) — no change needed there.
- Keep the existing `body { @apply font-sf-pro-text }` and `h1–h4 { font-family: 'SF Pro Display' }` rules.

Result: every component using `font-sans`, `font-display`, `font-headline`, `font-body`, `font-label` (and untouched defaults) renders in SF Pro across the app, in both light and dark modes.

## 2. Fix "My Courses" not showing enrolled courses

Root cause: the dashboard's enrollments query (and several other pages) reads from `public.course_enrollments`, which does not exist in the database (only `enrollments`, `course_enrollments_archive`, and `course_enrollments_legacy` exist). Supabase returns `relation "course_enrollments" does not exist`, the `useQuery` throws, and the dashboard renders the empty state. The same bug blocks course access checks on `/courses` and the catalog/detail pages.

Scope of fix (client only — no schema changes):

- `client/src/pages/dashboard.tsx`: remove the `course_enrollments` branch; rely solely on `enrollments` (which already has `progress`, `enrolled_at`, `course:courses(*)`). Keep dedup logic for safety.
- `client/src/pages/courses.tsx`: switch the user-enrollment lookup to the `enrollments` table (`select course_id, status` from `enrollments` keyed on `user_id`).
- `client/src/pages/course-detail.tsx`, `client/src/pages/course-browser.tsx`, `client/src/pages/course-search.tsx`, `client/src/pages/checkout.tsx`, `client/src/pages/profile.tsx`, `client/src/pages/video-player.tsx`, and `client/src/components/enrollment-form.tsx`: replace `from("course_enrollments")` reads/writes with `from("enrollments")`, mapping fields (`payment_status` filter dropped where it has no equivalent — use `status` where applicable).
- Admin components (`admin-enrollments-*.tsx`, `admin-courses-table.tsx`, `admin-users-profiles.tsx`, `admin-overview-stats.tsx`, `admin-notifications.tsx`): same swap to `enrollments` so admin views stop silently failing.

Out of scope: schema/migration work, payment-status reporting changes, RLS edits, or rewriting the enrollment data model.

## Verification

- Reload `/dashboard` while logged in as the affected learner → "My Courses" tab lists the enrollment, "Continue Learning" links work.
- `/courses` shows the same enrolled course with the correct CTA.
- Inspect any page (e.g. `/`, `/course-catalog`, a button, an input) — text renders in SF Pro Display (headings) / SF Pro Text (body, buttons, labels).
- Console shows no `relation "course_enrollments" does not exist` errors.
