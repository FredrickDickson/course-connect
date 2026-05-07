# Fix curriculum builder timeouts

## Root cause

Earlier migration replaced INSERT/UPDATE/DELETE policies on `quizzes`, `quiz_questions`, `quiz_answers` with `user_owns_*` helpers, but left the **SELECT** policies (and **all** policies on `assignments` and `lessons`) using deeply-nested `EXISTS (SELECT ... JOIN modules JOIN courses JOIN enrollments ...)` chains.

PostgREST evaluates SELECT policies on every read AND on the `RETURNING` clause of inserts/updates (the `?select=id` part). With multiple heavy SELECT policies OR'd together, this exceeds the 8s statement timeout — causing the 12s–22s 500 errors on quiz_questions POST, quiz_answers GET, assignments GET, and lessons PATCH.

The earlier `user_owns_lesson/quiz/question` helpers are `SECURITY DEFINER` so they bypass RLS recursion and run a single indexed lookup.

## Migration

Add one more helper and rewrite all remaining heavy policies:

1. **New helper** `public.user_can_view_lesson(_lesson_id uuid, _user_id uuid)` — `SECURITY DEFINER`, returns true if user is the course instructor OR has an enrollment row for the course. Single function avoids OR'd policies.

2. **`lessons`** — drop `Instructors can manage lessons of their modules`, `Lessons are viewable if course is viewable`, `lessons_instructors_*` (4 policies), `lessons_view_from_published_courses`. Recreate:
   - SELECT using `user_can_view_lesson(id, auth.uid()) OR EXISTS(SELECT 1 FROM modules m JOIN courses c ON c.id=m.course_id WHERE m.id=lessons.module_id AND c.is_published)` — wrapped in a single SECURITY DEFINER function `public.user_can_see_lesson`.
   - INSERT/UPDATE/DELETE using `user_owns_lesson_module(module_id, auth.uid())` (new SD helper checking instructor of the module's course).

3. **`quizzes`** — drop `Quizzes are viewable if lesson is viewable`, `quizzes_instructors_view`, `quizzes_view_enrolled`. Replace SELECT with a single policy: `user_can_view_lesson(lesson_id, auth.uid())`.

4. **`quiz_questions`** — drop `quiz_questions_view`. Replace with: `user_owns_quiz(quiz_id, auth.uid()) OR user_quiz_enrolled(quiz_id, auth.uid())` via a new SD helper `user_can_view_quiz`.

5. **`quiz_answers`** — drop `quiz_answers_view`. Replace with `user_can_view_question(question_id, auth.uid())` SD helper.

6. **`assignments`** — drop all 4 policies (`Assignments are viewable…`, `assignments_instructors_view`, `assignments_instructors_create`, `assignments_view_enrolled`). Recreate:
   - SELECT: `user_can_view_lesson(lesson_id, auth.uid())`
   - INSERT/UPDATE/DELETE: `user_owns_lesson(lesson_id, auth.uid())`

All new policies are scoped `TO authenticated` to avoid `anon` evaluation overhead.

## Why this fixes it

- All policy predicates become a single function call returning a boolean from one indexed lookup, instead of Postgres planning multi-table joins per row through RLS recursion.
- Removes duplicate OR'd SELECT policies (Postgres must evaluate every applicable policy until one passes).
- `SECURITY DEFINER` bypasses RLS inside the helper, so no recursive policy evaluation.

## Verification after apply

- Reload curriculum page — assignments and quiz_answers GETs should return in <500ms.
- Save a quiz question — POST to `/quiz_questions?...&select=id` should complete in <1s.
- Save lecture — PATCH to `/lessons` should complete in <1s.
