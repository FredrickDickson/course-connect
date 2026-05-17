# Plan: Three small UX/data fixes

## 1. Preserve lesson video when editing title only

**File:** `client/src/components/LectureContentEditor.tsx`

Problem: `handleSave` rebuilds the full `lessonData` payload based on the current `videoSource` state. If state has drifted from what's in the DB (e.g. `videoSource` initialized incorrectly, or the user only changed the title and never opened the Video tab), the update can wipe `video_url` / `mux_*` columns.

Fix: make the save merge instead of replace. When editing an existing lesson, only include video fields in the update if the user actually interacted with them. Concretely:

- Track a `videoDirty` flag, set to `true` by `handleVideoSourceChange`, `handleVideoUpload`, `handleVideoUrlChange`, `handleMuxUploadComplete`, `handleDeleteMuxVideo`.
- In `handleSave`, build `lessonData` with title/description/content/content_type/duration_seconds always, and only spread the video block (`video_url`, `video_platform`, `video_id`, `mux_asset_id`, `mux_playback_id`, `mux_status`) when `videoDirty` is true OR when creating a new lesson.
- For the `create_lesson` RPC path (new lesson), keep existing behavior.

This guarantees a pure title edit never touches video columns.

## 2. Instructors auto-enroll free in their own courses

**Files:** `client/src/pages/course-detail.tsx`, `server/storage/enrollment.ts` (or wherever `createEnrollment` lives — confirm path), and the enrollment edge function/route.

- In `course-detail.tsx` `handleEnroll`: if `user?.id === course.instructor_id`, skip checkout and call a direct enrollment helper that inserts a free `enrollments` row (status `ACTIVE`, payment_status `confirmed`, amount `0`, source `instructor_self`) via Supabase, then redirect to `/learn/${id}` (or the course's instructor resources page). Use `supabase.from('enrollments').upsert(...)` with `onConflict: 'user_id,course_id'` so re-clicking is idempotent.
- Update the eligibility check to short-circuit `ELIGIBLE` when the requester is the course instructor (server-side guard in `checkEligibility` for safety).
- Show "Manage course" CTA instead of "Enroll Now" once the instructor is enrolled, and hide the price card for the instructor.

## 3. Label $0 courses as "Free"

Replace raw `${course.price}` displays with a helper. Add `client/src/lib/format-price.ts`:

```ts
export const formatCoursePrice = (price: number | string | null | undefined, currency = "USD") => {
  const n = Number(price);
  if (!n || n <= 0) return "Free";
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

Apply in:
- `client/src/pages/courses.tsx` (line ~566, the `$${course.price.toLocaleString()}` cell)
- `client/src/pages/course-search.tsx`
- `client/src/pages/course-browser.tsx`
- `client/src/pages/course-detail.tsx` (both price blocks)
- `client/src/components/admin-courses-table.tsx`

The existing `course-card-status.tsx` already handles the Free case — leave it but switch to the helper for consistency.

## Technical notes

- No DB migration needed. Instructor self-enrollment uses existing `enrollments` schema.
- `formatCoursePrice` accepts string or number because `course.price` comes back as a numeric string from PostgREST.
- The `videoDirty` flag in the editor is the minimum-risk fix; we avoid restructuring the save pipeline.
