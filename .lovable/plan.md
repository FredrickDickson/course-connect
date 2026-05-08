
## What exists today

- `lessons.content_type` supports `video`, `article`, `quiz`, `assignment` (free-text in DB). `lessons.content` already holds the article HTML.
- `quizzes` + `quiz_questions` + `quiz_answers` + `quiz_attempts` tables exist. A working `/quiz/:quizId` page already exists.
- `assignments` + `assignment_submissions` tables exist, but **no student-facing UI**.
- The Udemy-style learn page only renders the video player; article/quiz/assignment lessons are invisible. Resources tab works (just done).

## Goals

1. In the learn page (`/learn/:courseId/:lessonId`), render the right content surface for each lesson based on `content_type` (video, article, quiz, assignment).
2. Show quizzes & assignments attached to the current video lesson in a dedicated tab so students can take/submit them without leaving the page.
3. Make the sidebar reflect content type with icons (▶ video, 📄 article, ❓ quiz, 📋 assignment).
4. Mark progress correctly per type:
   - Article: "Mark as complete" button.
   - Quiz: completion when a passing attempt exists.
   - Assignment: completion when a submission exists.

---

## 1. Lesson type detection + sidebar icons

`course-sidebar.tsx`:
- Pick icon by `content_type`: `Play` (video), `FileText` (article), `HelpCircle` (quiz), `ClipboardList` (assignment), `File` (other).
- Show duration for video, "Reading" for article, "Quiz · N questions" for quiz, "Assignment" for assignment.

## 2. Main content surface in `video-player.tsx`

Replace the unconditional `<VideoStage>` with a switch on `currentLesson.content_type`:

- `video` (default) → existing video player.
- `article` → new `ArticleStage` (white card, max-w-3xl, renders `lesson.content` HTML via `dangerouslySetInnerHTML` with sanitization). Bottom action: "Mark as complete" → calls existing `upsertProgress`.
- `quiz` → new `QuizStage` showing quiz title + Start button → opens existing `/quiz/:quizId` in a dialog (iframe) OR navigates. Plan: navigate (simpler, reuses page). After return, sidebar shows it as completed.
- `assignment` → new `AssignmentStage` with title, instructions, due date, and a submission form (textarea + optional file upload to existing `assignment-submissions` bucket). Inserts into `assignment_submissions`.

## 3. New "Activities" tab in `content-tabs.tsx`

Even for video lessons, the instructor can attach quizzes/assignments to that same lesson row. Add a new tab "Activities" that lists:
- Quizzes for this lesson (`quizzes.lesson_id = lesson.id`) with status badge (Not attempted / Passed / Failed) and "Start quiz" button → navigates to `/quiz/:quizId`.
- Assignments for this lesson (`assignments.lesson_id = lesson.id`) with due date, "View / Submit" → opens submission dialog.

Tab order becomes: Overview · Notes · Activities · Announcements · Resources.

## 4. Progress integration

- Article completion: insert/update `progress` row with `completed=true`.
- Quiz: the existing quiz attempt flow already inserts into `quiz_attempts`. Add a derived `lessonCompleted` check in the learn page: a lesson is considered complete if `progress.completed=true` OR (any quiz attached has a passing attempt) OR (any assignment attached has a submission). The sidebar checkbox stays driven by `progress` for explicit toggling, but auto-mark `progress.completed=true` when a passing quiz attempt or submission lands.
- Add a small `useQuery` for quiz attempts and submissions, scoped to the user, for all quizzes/assignments in the course. On data load, auto-upsert `progress.completed` for affected lessons.

## 5. Assignment submission UI

`AssignmentStage` and Activities-tab dialog (shared component `AssignmentSubmitDialog`):
- Existing submission shown read-only with score/feedback if graded.
- New submission: `Textarea` for response + optional file uploads to `assignment-submissions` bucket at `${user.id}/${assignment.id}/${uuid}-${name}` (multiple files allowed, store array of paths in `attachment_urls`).
- Submit button → insert `assignment_submissions` with `user_id`, `assignment_id`, `content`, `attachment_urls`, `submitted_at=now()`, `is_late_submission=now()>due_date`.
- After insert: invalidate query, show success toast, mark lesson complete.

## 6. Article rendering safety

Use `DOMPurify` (already in deps; verify) to sanitize `lesson.content` before `dangerouslySetInnerHTML`. If not installed, add it.

## Files

Edited:
- `client/src/pages/video-player.tsx` — type-aware main stage switch; auto-complete from quiz/assignment data.
- `client/src/components/learn/course-sidebar.tsx` — type icons + labels.
- `client/src/components/learn/content-tabs.tsx` — new Activities tab.
- `client/src/components/learn/types.ts` — extend `LearnLesson` (already has `content_type` + `content`).

Created:
- `client/src/components/learn/article-stage.tsx`
- `client/src/components/learn/quiz-stage.tsx` (mini panel; uses existing `/quiz/:quizId` page)
- `client/src/components/learn/assignment-stage.tsx`
- `client/src/components/learn/assignment-submit-dialog.tsx` (shared)

No DB migrations.

## Out of scope

- Embedded inline quiz UI (defer; reuse existing `/quiz/:quizId` page).
- Instructor grading workflow (already exists separately).
- Rich-text editor for assignment responses (plain Textarea).
