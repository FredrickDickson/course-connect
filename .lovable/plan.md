## Goal

1. Surface lesson-completion progress so it actually unlocks a downloadable certificate per course.
2. Add an instructor-visible "Upload Resource" UI on `/resources` so the E2E suite stops flagging it as `not_built`.

## Current state (verified)

- `progress` table + optimistic upsert already persist lesson check-offs (`client/src/pages/video-player.tsx` lines 78–124). No DB work needed for persistence.
- `/certification` is a static marketing page — no list of earned certificates, no preview button. E2E `cert:preview` expects a Preview/View button + iframe.
- `lesson_resources` table and `lesson-resources` storage bucket already exist; an upload dialog lives inside `content-tabs.tsx` (only reachable mid-lesson). The E2E hits `/resources`, which today is a marketing page → flagged `not_built`.
- A `certificates` table exists keyed per `(user_id, track, level, pathway)` — re-usable.

## Changes

### A. Certificate unlock + preview on `/certification`

Add a logged-in section above the marketing content:

1. Query `enrollments` for the current user → join `courses`, `modules`, `lessons`.
2. Query `progress` for those lesson ids; compute `completed/total` per course.
3. For each enrollment where `completed === total && total > 0`:
   - Show a card with course title, level/track, completion date, and **Preview** + **Download** buttons.
   - On Preview: open a `Dialog` with an `<iframe>` rendered from `client/src/lib/certificate-generator.ts` (existing jsPDF flow → blob URL).
   - On first preview/download for a course, upsert a row into `certificates` (so admins can audit issuance) — guarded by `onConflict` on `(user_id, track, level)`.
4. For incomplete enrollments, show a muted "X of Y lessons complete — finish all lessons to unlock your certificate" row (gives the learner clear feedback that boxes drive certificate availability).
5. Empty state when no enrollments: keep existing marketing copy.

No DB schema changes; uses existing `certificates`, `enrollments`, `progress`, `lessons`, `modules`, `courses` tables and current RLS.

### B. Instructor "Upload Resource" UI on `/resources`

Refactor `client/src/pages/resources.tsx`:

1. Use `useAuth()`. If `isInstructor()` (or admin), render an **Upload Resource** panel at the top of the page with `data-testid="resource-upload"` so E2E matches.
2. Panel contents:
   - Course selector (instructor's own courses) → Module selector → Lesson selector (cascading queries on `courses` / `modules` / `lessons`).
   - Resource name input, file input (PDF/DOC/PPT/ZIP/MP4 ≤ 50 MB) **or** external link input.
   - On submit: upload to `lesson-resources` bucket at `${course_id}/${lesson_id}/${uuid}-${name}`, then insert into `lesson_resources` (`name`, `file_url`, `resource_type`, `file_size_mb`).
   - List of recently uploaded resources for the selected lesson with delete (mirrors existing logic in `content-tabs.tsx` — extract a small shared helper to avoid duplication).
3. Non-instructor visitors see the existing marketing content unchanged.

### C. E2E adjustments

- `e2e/05-instructor.spec.ts` already looks for `[data-testid="resource-upload"]` on `/resources`; once panel ships it flips to `pass`. No spec edits required.
- `e2e/08-certificate.spec.ts` looks for a Preview/View button + iframe under `/certification` for the seeded student; once section A ships and the seed student has a completed enrollment it flips to `pass`. If seed student has no completed course, status stays `not_built` (acceptable — accurate).

## Out of scope

- Auto-issuing certificates via DB trigger (kept as application logic for now).
- Reworking quiz/assignment gating beyond the existing per-lesson `progress.completed` flag.
- Redesigning the marketing portion of `/certification` or `/resources`.

## Files touched

- `client/src/pages/certification.tsx` — add "My Certificates" section + preview dialog.
- `client/src/pages/resources.tsx` — add instructor upload panel (gated by role).
- `client/src/components/certificates/certificate-preview-dialog.tsx` *(new)* — iframe dialog wrapping `certificate-generator.ts`.
- `client/src/components/resources/instructor-resource-upload.tsx` *(new)* — cascading selectors + upload form.
- Possibly extract `lesson-resources` upload helper from `content-tabs.tsx` into `client/src/lib/lesson-resources.ts` to share logic.
