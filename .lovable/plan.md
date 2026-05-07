## Problem

The curriculum builder has several real bugs that explain why quizzes and assignments don't reliably save, and why CRUD feels broken:

1. **Quiz/Assignment "Save" inside the dialog only stores data in local React state** (`pendingQuizData` / `pendingAssignmentData`). If the user closes the dialog, switches tabs, or re-opens an existing lecture, that data is lost — nothing was persisted yet.
2. **The outer "Update Lecture" button is the only thing that actually writes to the DB**, but the toast on Quiz/Assignment Save says "saved" — misleading users into thinking it's persisted.
3. **Existing-quiz/assignment fetches use `.single()` instead of `.maybeSingle()`** for `quizzes` and (in part) for the existence check on save. With no row this throws `PGRST116`, which is silently swallowed in some places and surfaces as a hard error in others — so on edit, the previously-saved quiz often fails to reload.
4. **Quiz update path always deletes + re-inserts** (good for question diffs) but it's done from the outer save handler with stale `savedLessonId` references — when a brand-new lecture is created in the same session, `lessonIdToUse` falls back to `ensureLessonExists`, which inserts a *second* lesson row because `savedLessonId` state hasn't yet propagated.
5. **Assignment builder collects fields the DB doesn't have** (`submission_type`, `rubric`) and never persists them, so editing an assignment loses those values immediately.
6. **No standalone "Delete Quiz" / "Delete Assignment"** action — the only way to remove them is to delete the whole lecture.
7. **Reset effect in `LectureContentEditor`** runs on the `lesson` object identity, so opening "Add Lecture" right after editing one keeps the previous `savedLessonId` in some race conditions, leading to "edits" being applied to the wrong lecture.

## Fix

### 1. `LectureContentEditor.tsx` — make persistence atomic and immediate
- Replace the "pending data buffer" pattern with **direct save** when the user clicks Save inside `QuizBuilder` / `AssignmentBuilder`. The inner Save button writes straight to Supabase via a shared helper (`saveQuizForLesson`, `saveAssignmentForLesson`), then refetches `existingQuiz` / `existingAssignment`.
- Outer "Save Lecture" button only saves the lesson row (title, description, content_type, video, article).
- Use `.maybeSingle()` everywhere a row may not exist.
- Reset `savedLessonId` and all builder state when the dialog closes (`open` going false), not only when the `lesson` prop changes.
- Guard `ensureLessonExists` with a ref so concurrent calls return the same promise — prevents duplicate lesson rows.

### 2. New helper module `client/src/lib/curriculum-mutations.ts`
Centralize all quiz/assignment CRUD so the builder, dialog, and curriculum page share the same code:
- `upsertQuiz(lessonId, quizData)` — inserts/updates `quizzes`, then deletes & re-inserts `quiz_questions` + `quiz_answers` inside a single logical flow with rollback on error.
- `deleteQuiz(quizId)` — explicit delete (cascade handles questions/answers).
- `upsertAssignment(lessonId, data)`, `deleteAssignment(assignmentId)`.
- `fetchQuizForLesson(lessonId)`, `fetchAssignmentForLesson(lessonId)` — using `maybeSingle` and returning normalized camelCase shapes.

### 3. `QuizBuilder.tsx`
- Accept `lessonId` and call `upsertQuiz` directly on Save (with loading/disabled state and error toast).
- Replace `onSave` prop with `onSaved` (notification only).
- Add a **Delete Quiz** button (visible only when `initialQuiz?.id` exists) that calls `deleteQuiz` after a confirm.
- Fix the "uncheck others on multiple_choice" bug — current code returns the same answer object regardless of branch.

### 4. `AssignmentBuilder.tsx`
- Same pattern: direct upsert on Save, Delete button on edit.
- Drop UI for `submissionType` and `rubric` (not in schema). Optionally, add `submission_type` column + `assignment_rubrics` linkage in a follow-up — for now match what the DB supports so Save round-trips cleanly.

### 5. `course-curriculum.tsx`
- After `LectureContentEditor` `onSave`, also invalidate `["lesson-quiz", lessonId]` and `["lesson-assignment", lessonId]` query keys so badges refresh.
- Show a small badge on each lesson row indicating "Quiz attached" / "Assignment attached" with item count, querying the new helpers.
- Lecture delete already cascades via FK.

### 6. Pre-existing build errors (out of scope but blocking)
The build is currently red from prior unrelated TS errors in `level-upgrade-celebration.tsx`, `search-modal.tsx`, `course-catalog.tsx`, `course-search.tsx`, `courses.tsx`, `video-player.tsx`, and `server/storage/qualificationState.ts` — they reference a `track_progress` table the generated `Database` types don't know about (and a removed `STUDENT` enum value). They will need a quick pass to either remove the dead `track_progress` queries (the table is no longer in PostgREST) or cast through `as any`. I'll include minimal fixes for these in the same change so the project compiles after the curriculum rewrite.

## Files touched

- `client/src/components/LectureContentEditor.tsx` — refactor save flow
- `client/src/components/QuizBuilder.tsx` — direct persistence + delete
- `client/src/components/AssignmentBuilder.tsx` — direct persistence + delete, drop unsupported fields
- `client/src/lib/curriculum-mutations.ts` — **new** shared CRUD helpers
- `client/src/pages/course-curriculum.tsx` — query-invalidation + attached-badge
- Minor compile fixes in: `level-upgrade-celebration.tsx`, `search-modal.tsx`, `course-catalog.tsx`, `course-search.tsx`, `courses.tsx`, `video-player.tsx`, `server/storage/qualificationState.ts`

## What you'll see after

- Clicking **Save Quiz** or **Save Assignment** inside the lecture dialog persists immediately with a real success toast; closing the dialog no longer loses the work.
- Re-opening any lecture loads its existing quiz/assignment correctly (no more silent fetch errors).
- A **Delete** button appears on the quiz and assignment panels for already-saved items.
- Editing a brand-new lecture no longer creates duplicate lesson rows.
- Lesson rows in the curriculum show a small "Quiz · N questions" / "Assignment" badge.
