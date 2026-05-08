## Goal

When a learner completes the activity that defines a lesson, the sidebar checkbox for that lesson auto-ticks. Hide the Activities tab to remove the duplicated entry point.

## Current behavior

- Sidebar checkbox is driven by `progress` rows (`user_id`, `lesson_id`, `completed`).
- Auto-complete today fires only for: video at ≥90% watched, external video after 30s, manual checkbox click, and a "Mark complete" button on article stages.
- Quiz and assignment lessons never auto-complete — the user has to manually tick the box, even after passing/submitting.
- The Activities tab in `content-tabs.tsx` duplicates the per-lesson quiz/assignment cards already shown by `QuizStage` / `AssignmentStage`, plus the sidebar.

## Best-practice rule for quiz / assignment lessons

Industry standard (Udemy, Coursera, Moodle):

- **Quiz lesson** → marked complete the moment the learner records a **passing** attempt (`quiz_attempts.passed = true`). Failed attempts do not complete it; retakes after passing don't un-complete it.
- **Assignment lesson** → marked complete the moment a submission exists (`assignment_submissions` row for that user). Grading/score is tracked separately and does not gate completion. (If you'd rather wait for a passing grade, say so and we'll switch to `graded_at IS NOT NULL AND score >= passing`.)

This keeps "lesson complete" = "learner did the required action," while certificates/level upgrades remain gated on the existing course-completion logic.

## Changes

### 1. `client/src/components/learn/content-tabs.tsx`
- Remove `"activities"` from the tabs array on line 298 and wrap the `<TabsContent value="activities">` block (lines 363–411) in `{false && (...)}`, mirroring the Notes pattern. Leaves Overview, Announcements, Resources visible.

### 2. `client/src/components/learn/quiz-stage.tsx`
- After loading `attempts`, add a `useEffect` that, when `passed === true` and the current lesson's progress row is not yet `completed`, calls a new `onComplete?: () => void` prop passed in from `video-player.tsx`. Idempotent — only fires once per lesson per session.

### 3. `client/src/components/learn/assignment-stage.tsx`
- Same pattern: when `submission` exists and lesson not yet completed, call `onComplete?.()`.

### 4. `client/src/pages/video-player.tsx`
- Pass `onComplete={() => handleToggleComplete(currentLesson.id, true)}` into `<QuizStage>` and `<AssignmentStage>`.
- No changes to existing video / article auto-complete logic.

### 5. (Optional, defensive) `client/src/pages/quiz.tsx`
- After a successful `quiz-submit` invoke that returns `passed: true`, upsert the `progress` row directly so completion ticks even if the learner never re-opens the lesson page. Uses the same `supabase.from("progress").upsert(...)` shape already used in `video-player.tsx`.

## Out of scope

- No DB schema changes.
- No changes to the `quiz-submit` edge function.
- No change to certificate/level-upgrade triggers — those still depend on `enrollments.status = 'COMPLETED'` via the existing trigger.

## QA checklist

1. Open a video lesson → watch ≥90% → sidebar ticks (unchanged).
2. Open a quiz lesson → pass quiz → return to lesson → checkbox is ticked. Fail an attempt → checkbox stays empty.
3. Open an assignment lesson → submit → checkbox ticks.
4. Confirm Activities tab no longer renders; Overview/Announcements/Resources still work.
5. Manual uncheck in sidebar still works and persists.
